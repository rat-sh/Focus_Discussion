import { AppError } from '../../lib/errors'
import * as repo from './repo'

export interface ScheduledSessionDto {
  id: string
  roomId: string
  title: string
  topic: string
  startsAt: string
  durationMin: number
  roomCode: string
  going: number
  recurring: null
  isOrganizer: boolean
}

function toDto(row: repo.ScheduledSessionRow, userId: string): ScheduledSessionDto {
  return {
    id: row.id,
    roomId: row.room_id,
    title: row.title,
    topic: row.topic,
    startsAt: new Date(row.starts_at).toISOString(),
    durationMin: row.duration_min,
    roomCode: row.room_code,
    going: row.going,
    recurring: null,
    isOrganizer: row.owner_id === userId,
  }
}

function validateStartTime(value: string): void {
  if (!Number.isFinite(Date.parse(value)) || Date.parse(value) <= Date.now()) {
    throw AppError.validation('Session start time must be in the future')
  }
}

async function requireMembership(roomId: string, userId: string): Promise<void> {
  if (!(await repo.isRoomMember(roomId, userId))) throw AppError.notFound('Room not found')
}

export async function list(userId: string): Promise<ScheduledSessionDto[]> {
  return (await repo.listUpcoming(userId)).map((row) => toDto(row, userId))
}

export async function create(
  userId: string,
  input: { roomId: string; title: string; topic: string; startsAt: string; durationMin: number },
): Promise<ScheduledSessionDto> {
  validateStartTime(input.startsAt)
  await requireMembership(input.roomId, userId)
  return toDto(await repo.create({ ...input, ownerId: userId }), userId)
}

export async function update(
  userId: string,
  sessionId: string,
  input: { roomId: string; title: string; topic: string; startsAt: string; durationMin: number },
): Promise<ScheduledSessionDto> {
  const existing = await repo.getForUser(sessionId, userId)
  if (!existing) throw AppError.notFound('Scheduled session not found')
  if (existing.owner_id !== userId) throw AppError.forbidden('Only the organizer can update this session')
  validateStartTime(input.startsAt)
  await requireMembership(input.roomId, userId)
  if (!(await repo.update(sessionId, input))) throw AppError.notFound('Scheduled session not found')
  const updated = await repo.getForUser(sessionId, userId)
  if (!updated) throw AppError.notFound('Scheduled session not found')
  return toDto(updated, userId)
}

export async function remove(userId: string, sessionId: string): Promise<void> {
  const existing = await repo.getForUser(sessionId, userId)
  if (!existing) throw AppError.notFound('Scheduled session not found')
  if (existing.owner_id !== userId) throw AppError.forbidden('Only the organizer can cancel this session')
  if (!(await repo.remove(sessionId))) throw AppError.notFound('Scheduled session not found')
}
