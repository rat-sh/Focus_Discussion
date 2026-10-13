import { z } from 'zod'
import type { PersonSearchHit, Profile } from '@/domain/types'
import { ApiError } from '@/shared/lib/apiError'
import type { ProfileRepo } from '../repositories'
import { SUPABASE_URL } from '@/config/env'
import { supabaseApiRequest } from './request'
import { asArray, emailOf, uid } from './common'
import { getSupabase } from './client'
import { fromSupabase, unauthenticated } from './errors'

function ownAvatarPath(url: string | null, userId: string): string | null {
  if (!url || !SUPABASE_URL) return null
  try {
    const parsed = new URL(url)
    const expectedOrigin = new URL(SUPABASE_URL).origin
    const prefix = '/storage/v1/object/public/avatars/'
    if (parsed.origin !== expectedOrigin || !parsed.pathname.startsWith(prefix)) return null
    const path = decodeURIComponent(parsed.pathname.slice(prefix.length))
    return path.startsWith(`${userId}/`) ? path : null
  } catch {
    return null
  }
}

export const profileRepo: ProfileRepo = {
  async get() {
    const id = await uid()
    const email = await emailOf()
    const { data, error } = await getSupabase()
      .from('profiles')
      .select('user_id, name, handle, avatar_url, streak_days')
      .eq('user_id', id)
      .maybeSingle()
    if (error) fromSupabase(error)
    if (!data) unauthenticated()
    return {
      id: data.user_id as string,
      email,
      name: data.name as string,
      handle: data.handle as string,
      avatarUrl: (data.avatar_url as string | null) ?? null,
      streakDays: data.streak_days as number,
    } satisfies Profile
  },
  async update(patch) {
    const id = await uid()
    const { error } = await getSupabase().from('profiles').update({
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.handle !== undefined ? { handle: patch.handle } : {}),
      updated_at: new Date().toISOString(),
    }).eq('user_id', id)
    if (error) fromSupabase(error)
    return this.get()
  },
  async setAvatar(file) {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    const maxSize = 5 * 1024 * 1024
    if (file && !allowedTypes.includes(file.type)) {
      throw new ApiError('VALIDATION_FAILED', 'Choose a JPEG, PNG, or WebP image', 400)
    }
    if (file && file.size > maxSize) {
      throw new ApiError('VALIDATION_FAILED', 'Profile photos must be 5 MB or smaller', 400)
    }

    const userId = await uid()
    const supabase = getSupabase()
    const storage = supabase.storage.from('avatars')
    const { data: current, error: currentError } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('user_id', userId)
      .maybeSingle()
    if (currentError) fromSupabase(currentError)
    if (!current) throw new ApiError('NOT_FOUND', 'Profile not found', 404)

    let nextAvatar: string | null = null
    if (file) {
      const response: unknown = await supabaseApiRequest('/api/v1/profiles/avatar/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentType: file.type, size: file.size }),
      })
      const parsed = z.object({ path: z.string().min(1), token: z.string().min(1) }).safeParse(response)
      if (!parsed.success || !parsed.data.path.startsWith(`${userId}/`) || parsed.data.path.includes('..')) {
        throw new ApiError('INTERNAL', 'Avatar upload service returned an invalid signed upload', 502)
      }
      const path = parsed.data.path
      const { error: uploadError } = await storage.uploadToSignedUrl(path, parsed.data.token, file, {
        contentType: file.type,
        upsert: false,
      })
      if (uploadError) fromSupabase(uploadError)
      nextAvatar = storage.getPublicUrl(path).data.publicUrl
    }

    const { error: updateError } = await supabase.from('profiles').update({
      avatar_url: nextAvatar,
      updated_at: new Date().toISOString(),
    }).eq('user_id', userId)
    if (updateError) {
      if (file) {
        const path = ownAvatarPath(nextAvatar, userId)
        if (path) {
          const { error: cleanupError } = await storage.remove([path])
          if (cleanupError) {
            throw new ApiError('INTERNAL', 'Profile update failed and the uploaded image could not be removed', 500)
          }
        }
      }
      fromSupabase(updateError)
    }

    const oldPath = ownAvatarPath(current.avatar_url, userId)
    if (oldPath && oldPath !== ownAvatarPath(nextAvatar, userId)) {
      const { error: removeError } = await storage.remove([oldPath])
      if (removeError) throw new ApiError('INTERNAL', 'Profile photo was updated, but the previous image could not be removed', 500)
    }
    return this.get()
  },
  async byHandle(handle) {
    const { data, error } = await getSupabase().rpc('search_people', { p_query: handle })
    if (error) fromSupabase(error)
    const items = asArray<PersonSearchHit>(data)
    return items.find((i) => i.handle.toLowerCase() === handle.toLowerCase()) ?? null
  },
}
