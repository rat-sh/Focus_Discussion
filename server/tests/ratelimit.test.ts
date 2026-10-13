import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { LIMITS } from '../src/middleware/limits'
import { consumeRateLimit } from '../src/middleware/rateLimit'
import { closeValkey } from '../src/cache/valkey'
import { ensureTestDb } from './setup'
import { loadEnv } from '../src/config/env'

describe('rate limit', () => {
  beforeAll(async () => {
    await ensureTestDb()
    loadEnv(process.env)
  })
  afterAll(() => {
    closeValkey()
  })

  test('429 style deny after burst', async () => {
    const cls = { ...LIMITS['auth.register'], key: `test.reg.${String(Date.now())}`, burst: 2, rate: 2 }
    const id = `ip-${String(Date.now())}`
    const r1 = await consumeRateLimit(cls, id)
    const r2 = await consumeRateLimit(cls, id)
    const r3 = await consumeRateLimit(cls, id)
    expect(r1).not.toBe('unavailable')
    expect(r2).not.toBe('unavailable')
    expect(r3).not.toBe('unavailable')
    if (r1 !== 'unavailable' && r2 !== 'unavailable' && r3 !== 'unavailable') {
      expect(r1.allowed).toBe(true)
      expect(r2.allowed).toBe(true)
      expect(r3.allowed).toBe(false)
      expect(r3.retryAfterSec).toBeGreaterThan(0)
    }
  })

  test('fail closed vs open when valkey down', () => {
    expect(LIMITS['auth.login'].failClosed).toBe(true)
    expect(LIMITS['auth.register'].failClosed).toBe(true)
    expect(LIMITS['room.join.ip'].failClosed).toBe(true)
    expect(LIMITS.global.failClosed).toBe(false)
    expect(LIMITS.search.failClosed).toBe(false)
  })
})
