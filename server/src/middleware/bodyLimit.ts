import { createMiddleware } from 'hono/factory'
import { env } from '../config/env'
import { AppError } from '../lib/errors'

export const bodyLimit = createMiddleware(async (c, next) => {
  const limit = env().BODY_LIMIT_BYTES
  const len = c.req.header('content-length')
  if (len && Number(len) > limit) {
    throw AppError.validation(`Body exceeds ${String(limit)} bytes`)
  }
  await next()
})
