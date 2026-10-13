import { ApiError } from '@/shared/lib/apiError'
import type { ErrorCode } from '@studyroom/contract'

export function fromSupabase(err: { message: string; code?: string } | null, fallback = 'Request failed'): never {
  const message = err?.message ?? fallback
  if (/unauthor/i.test(message) || err?.code === 'PGRST301') {
    throw new ApiError('UNAUTHENTICATED', 'Sign in required', 401)
  }
  if (message.startsWith('NOT_FOUND')) throw new ApiError('NOT_FOUND', strip(message), 404)
  if (message.startsWith('GONE')) throw new ApiError('GONE', strip(message), 410)
  if (message.startsWith('CONFLICT')) throw new ApiError('CONFLICT', strip(message), 409)
  if (message.startsWith('FORBIDDEN')) throw new ApiError('FORBIDDEN', strip(message), 403)
  if (err?.code === '23505') throw new ApiError('CONFLICT', 'Already exists', 409)
  if (err?.code === '42501') throw new ApiError('FORBIDDEN', 'Forbidden', 403)
  if (err?.code === 'PGRST116') throw new ApiError('NOT_FOUND', 'Not found', 404)
  throw new ApiError('INTERNAL', 'Request failed', 500)
}

function strip(message: string): string {
  return message.replace(/^(NOT_FOUND|GONE|CONFLICT|FORBIDDEN):\s*/, '')
}

export function unavailable(feature: string): never {
  throw new ApiError('GONE' satisfies ErrorCode, `${feature} is not available yet`, 410)
}

export function unauthenticated(): never {
  throw new ApiError('UNAUTHENTICATED', 'Sign in required', 401)
}
