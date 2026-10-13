import type { ErrorCode } from '@studyroom/contract'

export class AppError extends Error {
  readonly code: ErrorCode
  readonly status: number
  readonly details?: unknown
  readonly retryAfterSec?: number

  constructor(
    code: ErrorCode,
    message: string,
    status: number,
    opts?: { details?: unknown; retryAfterSec?: number; cause?: unknown },
  ) {
    super(message, opts?.cause !== undefined ? { cause: opts.cause } : undefined)
    this.name = 'AppError'
    this.code = code
    this.status = status
    this.details = opts?.details
    this.retryAfterSec = opts?.retryAfterSec
  }

  static validation(message: string, details?: unknown): AppError {
    return new AppError('VALIDATION_FAILED', message, 400, { details })
  }
  static unauthenticated(message = 'Unauthenticated'): AppError {
    return new AppError('UNAUTHENTICATED', message, 401)
  }
  static forbidden(message = 'Forbidden'): AppError {
    return new AppError('FORBIDDEN', message, 403)
  }
  static notFound(message = 'Not found'): AppError {
    return new AppError('NOT_FOUND', message, 404)
  }
  static conflict(message: string, details?: unknown): AppError {
    return new AppError('CONFLICT', message, 409, { details })
  }
  static gone(message: string): AppError {
    return new AppError('GONE', message, 410)
  }
  static rateLimited(retryAfterSec: number, message = 'Too many requests'): AppError {
    return new AppError('RATE_LIMITED', message, 429, { retryAfterSec })
  }
  static internal(message = 'Internal server error'): AppError {
    return new AppError('INTERNAL', message, 500)
  }
}
