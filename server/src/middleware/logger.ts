import { createMiddleware } from 'hono/factory'
import { logger } from '../lib/logger'

export const requestLogger = createMiddleware(async (c, next) => {
  const start = Date.now()
  await next()
  logger.info('request', {
    requestId: c.get('requestId'),
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
    ms: Date.now() - start,
  })
})
