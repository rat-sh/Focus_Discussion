import type { Room, RoomMode } from '@/domain/types'
import { getSupabase } from './client'
import { unauthenticated } from './errors'

export function asArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[]
  return []
}

export function asObject<T>(data: unknown): T | null {
  if (data && typeof data === 'object' && !Array.isArray(data)) return data as T
  return null
}

export async function uid(): Promise<string> {
  const { data, error } = await getSupabase().auth.getUser()
  if (error || !data.user) unauthenticated()
  return data.user.id
}

export async function emailOf(): Promise<string> {
  const { data, error } = await getSupabase().auth.getUser()
  if (error || !data.user) unauthenticated()
  return data.user.email ?? ''
}

export function mapRoom(row: {
  id: string
  code: string
  name: string
  topic: string
  mode: RoomMode
  membership: 'owner' | 'member'
  owner_name: string
  member_count: number
  session_count: number
  last_session_at: string | null
}): Room {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    topic: row.topic,
    mode: row.mode,
    membership: row.membership,
    ownerName: row.owner_name,
    memberCount: row.member_count,
    sessionCount: row.session_count,
    lastSessionAt: row.last_session_at,
  }
}
