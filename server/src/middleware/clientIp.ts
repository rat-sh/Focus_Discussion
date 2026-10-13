import { createMiddleware } from 'hono/factory'
import { env } from '../config/env'

export const clientIp = createMiddleware(async (c, next) => {
  let ip = '0.0.0.0'
  if (env().TRUST_PROXY) {
    const xff = c.req.header('X-Forwarded-For')
    if (xff) {
      const first = xff.split(',')[0]?.trim()
      if (first) ip = first
    }
  } else {
    // Bun may expose remote address via header in some setups; fall back.
    ip = c.req.header('x-real-ip') ?? '127.0.0.1'
  }
  c.set('clientIp', ip)
  await next()
})

declare module 'hono' {
  interface ContextVariableMap {
    clientIp: string
  }
}
