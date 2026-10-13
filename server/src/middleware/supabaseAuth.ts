import { z } from 'zod'
import { env } from '../config/env'
import { AppError } from '../lib/errors'

const SupabaseUser = z.object({
  id: z.string().uuid(),
  email: z.string().email().nullable().optional(),
  user_metadata: z.unknown().optional(),
})

export async function supabaseUser(
  authorization: string | undefined,
): Promise<{ id: string; email: string; name: string }> {
  const config = env()
  if (!config.SUPABASE_URL || !config.SUPABASE_ANON_KEY) {
    throw new AppError('INTERNAL', 'Supabase authentication is not configured', 503)
  }
  if (!authorization?.startsWith('Bearer ')) throw AppError.unauthenticated()

  let response: Response
  try {
    response = await fetch(`${config.SUPABASE_URL.replace(/\/+$/, '')}/auth/v1/user`, {
      headers: { apikey: config.SUPABASE_ANON_KEY, Authorization: authorization },
    })
  } catch {
    throw new AppError('INTERNAL', 'Could not verify the signed-in user', 503)
  }
  if (!response.ok) throw AppError.unauthenticated()

  let body: unknown
  try {
    body = await response.json()
  } catch {
    throw new AppError('INTERNAL', 'Supabase returned an invalid user response', 502)
  }
  const parsed = SupabaseUser.safeParse(body)
  if (!parsed.success) throw AppError.unauthenticated()
  const metadata = parsed.data.user_metadata
  const name = typeof metadata === 'object' && metadata !== null && 'name' in metadata &&
    typeof metadata.name === 'string' ? metadata.name.slice(0, 60) : parsed.data.id
  return { id: parsed.data.id, email: parsed.data.email ?? '', name }
}
