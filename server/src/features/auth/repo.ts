import type { SQL } from 'bun'
import { getSql } from '../../db/sql'

export interface ProfileRow {
  user_id: string
  name: string
  handle: string
  avatar_url: string | null
  streak_days: number
  email: string
}

export async function getProfile(
  userId: string,
  email: string,
  db: SQL = getSql(),
): Promise<ProfileRow | null> {
  const rows = await db<ProfileRow[]>`
    SELECT user_id, name, handle::text AS handle, avatar_url, streak_days,
      ${email}::text AS email
    FROM profiles
    WHERE user_id = ${userId}::uuid
    LIMIT 1
  `
  return rows[0] ?? null
}

export async function updateProfile(
  userId: string,
  email: string,
  patch: { name?: string; handle?: string },
  db: SQL = getSql(),
): Promise<ProfileRow | null> {
  const rows = await db<ProfileRow[]>`
    UPDATE profiles
    SET
      name = COALESCE(${patch.name ?? null}, name),
      handle = COALESCE(${patch.handle ?? null}, handle),
      updated_at = now()
    WHERE user_id = ${userId}::uuid
    RETURNING user_id, name, handle::text AS handle, avatar_url, streak_days,
      ${email}::text AS email
  `
  return rows[0] ?? null
}
