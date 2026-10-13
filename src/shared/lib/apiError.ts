import type { ErrorCode } from '@studyroom/contract'

export class ApiError extends Error {
  readonly code: ErrorCode
  readonly status: number
  readonly details?: unknown
  readonly retryAfterSec?: number

  constructor(
    code: ErrorCode,
    message: string,
    status: number,
    opts?: { details?: unknown; retryAfterSec?: number },
  ) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.details = opts?.details
    this.retryAfterSec = opts?.retryAfterSec
  }
}
