import { createMiddleware } from 'hono/factory'
import { getValkey } from '../cache/valkey'
import { AppError } from '../lib/errors'
import { logger } from '../lib/logger'
import { LIMITS, type LimitName, type RateLimitClass } from './limits'

/** Atomic token-bucket. Returns [allowed (0/1), remaining, retry_after_sec, reset_sec]. */
const TOKEN_BUCKET_LUA = `
local key = KEYS[1]
local rate = tonumber(ARGV[1])
local interval = tonumber(ARGV[2])
local burst = tonumber(ARGV[3])
local now = tonumber(ARGV[4])
local cost = tonumber(ARGV[5])

local data = redis.call('HMGET', key, 'tokens', 'ts')
local tokens = tonumber(data[1])
local ts = tonumber(data[2])

if tokens == nil then
  tokens = burst
  ts = now
end

local elapsed = math.max(0, now - ts)
local refill = (elapsed / interval) * rate
tokens = math.min(burst, tokens + refill)
ts = now

local allowed = 0
local retry_after = 0
if tokens >= cost then
  tokens = tokens - cost
  allowed = 1
else
  local need = cost - tokens
  retry_after = math.ceil((need / rate) * interval)
end

redis.call('HMSET', key, 'tokens', tokens, 'ts', ts)
redis.call('EXPIRE', key, math.ceil(interval * 2))

local reset = math.ceil(interval - ((tokens / rate) * interval))
if reset < 0 then reset = 0 end
return { allowed, math.floor(tokens), retry_after, reset }
`

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  retryAfterSec: number
  resetSec: number
  limit: number
}

export async function consumeRateLimit(
  cls: RateLimitClass,
  id: string,
  cost = 1,
): Promise<RateLimitResult | 'unavailable'> {
  const key = `rl:${cls.key}:${id}`
  try {
    const r = getValkey()
    const now = Math.floor(Date.now() / 1000)
    const raw = (await r.eval(TOKEN_BUCKET_LUA, 1, key,
      String(cls.rate),
      String(cls.intervalSec),
      String(cls.burst),
      String(now),
      String(cost),
    )) as unknown

    const arr = normalizeEval(raw)
    const allowed = (arr[0] ?? 0) === 1
    return {
      allowed,
      remaining: arr[1] ?? 0,
      retryAfterSec: Math.max(1, arr[2] ?? 1),
      resetSec: arr[3] ?? cls.intervalSec,
      limit: cls.burst,
    }
  } catch (err) {
    logger.warn('rate limit valkey error', { err: String(err), class: cls.key })
    return 'unavailable'
  }
}

function normalizeEval(raw: unknown): number[] {
  if (Array.isArray(raw)) return raw.map((v) => Number(v))
  if (typeof raw === 'string') {
    try {
      const parsed: unknown = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed.map((v) => Number(v))
    } catch {
      /* ignore */
    }
  }
  return [1, 0, 0, 0]
}

export function rateLimit(name: LimitName, idFrom: (c: { get: (k: string) => unknown; req: { header: (n: string) => string | undefined } }) => string) {
  const cls = LIMITS[name]
  return createMiddleware(async (c, next) => {
    const id = idFrom(c)
    const result = await consumeRateLimit(cls, id)
    if (result === 'unavailable') {
      if (cls.failClosed) {
        throw AppError.rateLimited(30, 'Rate limiter unavailable')
      }
      await next()
      return
    }
    c.header('RateLimit-Limit', String(result.limit))
    c.header('RateLimit-Remaining', String(Math.max(0, result.remaining)))
    c.header('RateLimit-Reset', String(result.resetSec))
    if (!result.allowed) {
      c.header('Retry-After', String(result.retryAfterSec))
      throw AppError.rateLimited(result.retryAfterSec)
    }
    await next()
  })
}
