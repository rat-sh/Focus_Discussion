import { getSupabase } from './client'
import { ApiError } from '@/shared/lib/apiError'

const API_BASE_URL = import.meta.env.DEV ? '' : window.location.origin

export async function supabaseApiRequest(path: string, init: RequestInit = {}): Promise<unknown> {
  const { data, error } = await getSupabase().auth.getSession()
  if (error) throw new ApiError('UNAUTHENTICATED', 'Could not load your sign-in session', 401)
  const accessToken = data.session?.access_token
  if (!accessToken) throw new ApiError('UNAUTHENTICATED', 'Sign in to use this feature', 401)

  const headers = new Headers(init.headers)
  headers.set('Authorization', `Bearer ${accessToken}`)
  headers.set('X-Request-Id', crypto.randomUUID())
  let response: Response
  try {
    const url = API_BASE_URL ? new URL(path, API_BASE_URL).toString() : path
    response = await fetch(url, { ...init, headers, credentials: 'include' })
  } catch (cause) {
    const message = cause instanceof Error && cause.message.toLowerCase().includes('fetch')
      ? 'Could not reach the Focus Lock API. Verify the server is running and check /healthz and /readyz.'
      : 'Could not connect to the Focus Lock API. Check the backend and try again.'
    throw new ApiError('INTERNAL', message, 503, { details: cause })
  }
  if (!response.ok) {
    let message = `Request failed (${response.status})`
    try {
      const body: unknown = await response.json()
      if (typeof body === 'object' && body !== null && 'error' in body) {
        const detail = body.error
        if (typeof detail === 'object' && detail !== null && 'message' in detail && typeof detail.message === 'string') {
          message = detail.message
        }
      }
    } catch {
      // Preserve the HTTP failure when the response body is not JSON.
    }
    if (response.status === 502 && message === 'Request failed (502)') {
      message = 'The Focus Lock API is not responding. Verify the server is running and check /healthz and /readyz.'
    } else if (response.status === 429 && message.toLowerCase().includes('rate limiter unavailable')) {
      message = 'The live API is online, but its Valkey rate limiter is unavailable. Start or reconnect Valkey, verify /readyz, and retry.'
    } else if (response.status === 500 && message.toLowerCase() === 'internal server error') {
      message = 'The live API could not complete this request. Check /readyz and the backend logs.'
    }
    throw new ApiError('INTERNAL', message, response.status)
  }
  return response.json()
}
