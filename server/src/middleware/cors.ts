import { cors } from 'hono/cors'
import { corsOrigins } from '../config/env'

export function buildCors() {
  const origins = corsOrigins()
  return cors({
    origin: (origin) => (origins.includes(origin) ? origin : origins[0] ?? ''),
    credentials: true,
    allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-Id'],
    exposeHeaders: ['X-Request-Id', 'Retry-After', 'RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset'],
  })
}
