import { z } from 'zod'
import type { ScheduledSession } from '@/domain/types'
import { ApiError } from '@/shared/lib/apiError'
import { supabaseApiRequest } from './request'

const ScheduledSessionResponse = z.object({
  id: z.string().uuid(),
  roomId: z.string().uuid(),
  title: z.string(),
  topic: z.string(),
  startsAt: z.string(),
  durationMin: z.number().int(),
  roomCode: z.string(),
  going: z.number().int().nonnegative(),
  recurring: z.null(),
  isOrganizer: z.boolean(),
})

type SessionInput = { roomId: string; title: string; topic: string; startsAt: string; durationMin: number }

function parseSession(value: unknown): ScheduledSession {
  const parsed = ScheduledSessionResponse.safeParse(value)
  if (!parsed.success) throw new ApiError('INTERNAL', 'Schedule service returned an invalid session', 502)
  return parsed.data
}

export async function listScheduledSessions(): Promise<ScheduledSession[]> {
  const body = await supabaseApiRequest('/api/v1/schedule')
  const parsed = z.object({ items: z.array(ScheduledSessionResponse) }).safeParse(body)
  if (!parsed.success) throw new ApiError('INTERNAL', 'Schedule service returned invalid sessions', 502)
  return parsed.data.items
}

export async function createScheduledSession(input: SessionInput): Promise<ScheduledSession> {
  return parseSession(await supabaseApiRequest('/api/v1/schedule', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  }))
}

export async function updateScheduledSession(id: string, input: SessionInput): Promise<ScheduledSession> {
  return parseSession(await supabaseApiRequest(`/api/v1/schedule/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  }))
}

export async function removeScheduledSession(id: string): Promise<void> {
  await supabaseApiRequest(`/api/v1/schedule/${encodeURIComponent(id)}`, { method: 'DELETE' })
}
