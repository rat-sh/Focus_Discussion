import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { env } from '../../config/env'
import { AppError } from '../../lib/errors'
import { rateLimit } from '../../middleware/rateLimit'
import { supabaseUser } from '../../middleware/supabaseAuth'

const AvatarUploadBody = z.object({
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  size: z.number().int().min(1).max(5 * 1024 * 1024),
}).strict()
const SignedUploadResponse = z.object({ token: z.string().min(1) })

export const profileRoutes = new Hono()

profileRoutes.post(
  '/avatar/upload-url',
  rateLimit('profile.avatar', (c) => String(c.get('clientIp'))),
  zValidator('json', AvatarUploadBody),
  async (c) => {
    const user = await supabaseUser(c.req.header('Authorization'))
    const config = env()
    if (!config.SUPABASE_URL || !config.SUPABASE_ANON_KEY) {
      throw new AppError('INTERNAL', 'Supabase Storage is not configured', 503)
    }

    const path = `${user.id}/${crypto.randomUUID()}`
    let response: Response
    try {
      response = await fetch(
        `${config.SUPABASE_URL.replace(/\/+$/, '')}/storage/v1/object/upload/sign/avatars/${encodeURI(path)}`,
        {
          method: 'POST',
          headers: {
            apikey: config.SUPABASE_ANON_KEY,
            Authorization: c.req.header('Authorization') ?? '',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ upsert: false }),
        },
      )
    } catch {
      throw new AppError('INTERNAL', 'Could not request a signed avatar upload URL', 503)
    }
    if (!response.ok) throw new AppError('INTERNAL', 'Supabase Storage refused the signed avatar upload request', 502)

    let body: unknown
    try {
      body = await response.json()
    } catch {
      throw new AppError('INTERNAL', 'Supabase Storage returned an invalid signed upload response', 502)
    }
    const parsed = SignedUploadResponse.safeParse(body)
    if (!parsed.success) throw new AppError('INTERNAL', 'Supabase Storage returned an invalid signed upload response', 502)
    return c.json({ path, token: parsed.data.token })
  },
)
