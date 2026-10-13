import type { SQL } from 'bun'
import { getSql } from '../../db/sql'

export interface ScheduledSessionRow {
  id: string
  room_id: string
  room_code: string
  owner_id: string
  title: string
  topic: string
  starts_at: Date
  duration_min: number
  going: number
}

function sessionSelect(db: SQL, sessionId: string, userId: string) {
  return db<ScheduledSessionRow[]>`
    SELECT s.id, s.room_id, r.code AS room_code, s.owner_id, s.title, s.topic,
      s.starts_at, s.duration_min,
      (SELECT count(*)::int FROM room_members rm WHERE rm.room_id = s.room_id) AS going
    FROM scheduled_sessions s
    JOIN rooms r ON r.id = s.room_id
    WHERE s.id = ${sessionId}::uuid
      AND EXISTS (
        SELECT 1 FROM room_members rm
        WHERE rm.room_id = s.room_id AND rm.user_id = ${userId}::uuid
      )
    LIMIT 1
  `
}

export async function isRoomMember(roomId: string, userId: string, db: SQL = getSql()): Promise<boolean> {
  const rows = await db<{ present: number }[]>`
    SELECT 1 AS present FROM room_members
    WHERE room_id = ${roomId}::uuid AND user_id = ${userId}::uuid
    LIMIT 1
  `
  return Boolean(rows[0])
}

export async function listUpcoming(userId: string, db: SQL = getSql()): Promise<ScheduledSessionRow[]> {
  return db<ScheduledSessionRow[]>`
    SELECT s.id, s.room_id, r.code AS room_code, s.owner_id, s.title, s.topic,
      s.starts_at, s.duration_min,
      (SELECT count(*)::int FROM room_members rm WHERE rm.room_id = s.room_id) AS going
    FROM scheduled_sessions s
    JOIN rooms r ON r.id = s.room_id
    WHERE s.starts_at > now()
      AND EXISTS (
        SELECT 1 FROM room_members rm
        WHERE rm.room_id = s.room_id AND rm.user_id = ${userId}::uuid
      )
    ORDER BY s.starts_at ASC
  `
}

export async function getForUser(sessionId: string, userId: string, db: SQL = getSql()): Promise<ScheduledSessionRow | null> {
  return (await sessionSelect(db, sessionId, userId))[0] ?? null
}

export async function create(
  input: { roomId: string; ownerId: string; title: string; topic: string; startsAt: string; durationMin: number },
  db: SQL = getSql(),
): Promise<ScheduledSessionRow> {
  const rows = await db<{ id: string }[]>`
    INSERT INTO scheduled_sessions (room_id, owner_id, title, topic, starts_at, duration_min)
    VALUES (
      ${input.roomId}::uuid, ${input.ownerId}::uuid, ${input.title}, ${input.topic},
      ${input.startsAt}::timestamptz, ${input.durationMin}
    )
    RETURNING id
  `
  const row = rows[0]
  if (!row) throw new Error('create scheduled session failed')
  const result = await sessionSelect(db, row.id, input.ownerId)
  if (!result[0]) throw new Error('scheduled session not found after create')
  return result[0]
}

export async function update(
  sessionId: string,
  input: { roomId: string; title: string; topic: string; startsAt: string; durationMin: number },
  db: SQL = getSql(),
): Promise<boolean> {
  const rows = await db<{ id: string }[]>`
    UPDATE scheduled_sessions
    SET room_id = ${input.roomId}::uuid,
      title = ${input.title},
      topic = ${input.topic},
      starts_at = ${input.startsAt}::timestamptz,
      duration_min = ${input.durationMin},
      updated_at = now()
    WHERE id = ${sessionId}::uuid
    RETURNING id
  `
  return Boolean(rows[0])
}

export async function remove(sessionId: string, db: SQL = getSql()): Promise<boolean> {
  const rows = await db<{ id: string }[]>`
    DELETE FROM scheduled_sessions WHERE id = ${sessionId}::uuid RETURNING id
  `
  return Boolean(rows[0])
}
