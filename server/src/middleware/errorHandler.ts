import type { ErrorHandler } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { AppError } from '../lib/errors'
import { logger } from '../lib/logger'

export const errorHandler: ErrorHandler = (err, c) => {
  const requestId = c.get('requestId')

  if (err instanceof AppError) {
    if (err.retryAfterSec !== undefined) {
      c.header('Retry-After', String(err.retryAfterSec))
    }
    return c.json(
      {
        error: {
          code: err.code,
          message: err.message,
          ...(err.details !== undefined ? { details: err.details } : {}),
          ...(err.retryAfterSec !== undefined ? { retryAfterSec: err.retryAfterSec } : {}),
        },
      },
      err.status as ContentfulStatusCode,
    )
  }

  logger.error('unhandled', { requestId, err: String(err) })
  return c.json(
    {
      error: {
        code: 'INTERNAL' as const,
        message: 'Internal server error',
      },
    },
    500,
  )
}
