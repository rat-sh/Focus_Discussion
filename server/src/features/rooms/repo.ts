import type { SQL } from 'bun'
import { getSql } from '../../db/sql'

export interface RoomRow {
  id: string
  code: string
  name: string
  topic: string
  mode: 'study' | 'teach'
  owner_id: string
  max_members: number
  closed: boolean
  expires_at: Date | null
  owner_name: string
  member_count: number
  session_count: number
  last_session_at: Date | null
  membership: 'owner' | 'member'
}

export interface RoomChatRow {
  id: string
  user_id: string
  author: string
  text: string
  created_at: Date
}

export interface RoomWhiteboardStrokeRow {
  id: string
  user_id: string
  color: string
  width: number
  points: { x: number; y: number }[]
  created_at: Date
}

export interface RoomPlaybackStateRow {
  video_id: string
  is_playing: boolean
  position_seconds: number
  controller_id: string
  controller_name: string
  updated_at: Date
}

export async function createRoom(
  input: { code: string; name: string; topic: string; mode: string; ownerId: string },
  db: SQL = getSql(),
): Promise<RoomRow> {
  return db.begin(async (tx) => {
    const rooms = await tx<{ id: string }[]>`
      INSERT INTO rooms (code, name, topic, mode, owner_id)
      VALUES (${input.code}, ${input.name}, ${input.topic}, ${input.mode}, ${input.ownerId}::uuid)
      RETURNING id
    `
    const room = rooms[0]
    if (!room) throw new Error('create room failed')
    await tx`
      INSERT INTO room_members (room_id, user_id, role)
      VALUES (${room.id}::uuid, ${input.ownerId}::uuid, 'owner')
    `
    const rows = await listMineQuery(input.ownerId, tx)
    const found = rows.find((r) => r.id === room.id)
    if (!found) throw new Error('room not found after create')
    return found
  })
}

function listMineQuery(userId: string, db: SQL) {
  return db<RoomRow[]>`
    SELECT
      r.id, r.code, r.name, r.topic, r.mode, r.owner_id, r.max_members, r.closed, r.expires_at,
      p.name AS owner_name,
      (SELECT count(*)::int FROM room_members m WHERE m.room_id = r.id) AS member_count,
      0 AS session_count,
      NULL::timestamptz AS last_session_at,
      rm.role AS membership
    FROM room_members rm
    JOIN rooms r ON r.id = rm.room_id
    JOIN profiles p ON p.user_id = r.owner_id
    WHERE rm.user_id = ${userId}::uuid
    ORDER BY r.created_at DESC
  `
}

export async function listMine(userId: string, db: SQL = getSql()): Promise<RoomRow[]> {
  return listMineQuery(userId, db)
}

export async function getRoomForUser(
  roomId: string,
  userId: string,
  db: SQL = getSql(),
): Promise<RoomRow | null> {
  const rows = await db<RoomRow[]>`
    SELECT
      r.id, r.code, r.name, r.topic, r.mode, r.owner_id, r.max_members, r.closed, r.expires_at,
      p.name AS owner_name,
      (SELECT count(*)::int FROM room_members m WHERE m.room_id = r.id) AS member_count,
      0 AS session_count,
      NULL::timestamptz AS last_session_at,
      rm.role AS membership
    FROM rooms r
    JOIN room_members rm ON rm.room_id = r.id AND rm.user_id = ${userId}::uuid
    JOIN profiles p ON p.user_id = r.owner_id
    WHERE r.id = ${roomId}::uuid
    LIMIT 1
  `
  return rows[0] ?? null
}

export async function findByCode(code: string, db: SQL = getSql()) {
  const rows = await db<{
    id: string
    code: string
    name: string
    topic: string
    mode: 'study' | 'teach'
    owner_id: string
    max_members: number
    closed: boolean
    expires_at: Date | null
    owner_name: string
    member_count: number
  }[]>`
    SELECT
      r.id, r.code, r.name, r.topic, r.mode, r.owner_id, r.max_members, r.closed, r.expires_at,
      p.name AS owner_name,
      (SELECT count(*)::int FROM room_members m WHERE m.room_id = r.id) AS member_count
    FROM rooms r
    JOIN profiles p ON p.user_id = r.owner_id
    WHERE upper(r.code) = upper(${code})
    LIMIT 1
  `
  return rows[0] ?? null
}

export async function updateRoom(
  roomId: string,
  patch: { name?: string; topic?: string; closed?: boolean },
  db: SQL = getSql(),
) {
  const rows = await db<{ id: string }[]>`
    UPDATE rooms SET
      name = COALESCE(${patch.name ?? null}, name),
      topic = COALESCE(${patch.topic ?? null}, topic),
      closed = COALESCE(${patch.closed ?? null}, closed),
      updated_at = now()
    WHERE id = ${roomId}::uuid
    RETURNING id
  `
  return rows[0] ?? null
}

export async function deleteRoom(roomId: string, db: SQL = getSql()): Promise<boolean> {
  const rows = await db<{ id: string }[]>`
    DELETE FROM rooms WHERE id = ${roomId}::uuid RETURNING id
  `
  return Boolean(rows[0])
}

export async function isMember(roomId: string, userId: string, db: SQL = getSql()): Promise<boolean> {
  const rows = await db<{ ok: number }[]>`
    SELECT 1 AS ok FROM room_members
    WHERE room_id = ${roomId}::uuid AND user_id = ${userId}::uuid
    LIMIT 1
  `
  return Boolean(rows[0])
}

export async function profileName(userId: string, db: SQL = getSql()): Promise<string | null> {
  const rows = await db<{ name: string }[]>`
    SELECT name FROM profiles WHERE user_id = ${userId}::uuid LIMIT 1
  `
  return rows[0]?.name ?? null
}

export async function addMember(roomId: string, userId: string, db: SQL = getSql()): Promise<void> {
  await db`
    INSERT INTO room_members (room_id, user_id, role)
    VALUES (${roomId}::uuid, ${userId}::uuid, 'member')
    ON CONFLICT DO NOTHING
  `
}

export async function removeMember(roomId: string, userId: string, db: SQL = getSql()): Promise<void> {
  await db`
    DELETE FROM room_members
    WHERE room_id = ${roomId}::uuid AND user_id = ${userId}::uuid AND role <> 'owner'
  `
}

export async function listMembers(roomId: string, db: SQL = getSql()) {
  return db<{
    user_id: string
    name: string
    handle: string
    role: 'owner' | 'member'
    joined_at: Date
  }[]>`
    SELECT rm.user_id, p.name, p.handle::text AS handle, rm.role, rm.joined_at
    FROM room_members rm
    JOIN profiles p ON p.user_id = rm.user_id
    WHERE rm.room_id = ${roomId}::uuid
    ORDER BY rm.joined_at ASC
  `
}

export async function codeExists(code: string, db: SQL = getSql()): Promise<boolean> {
  const rows = await db<{ ok: number }[]>`
    SELECT 1 AS ok FROM rooms WHERE code = ${code} LIMIT 1
  `
  return Boolean(rows[0])
}

export async function listChat(roomId: string, db: SQL = getSql()): Promise<RoomChatRow[]> {
  const rows = await db<RoomChatRow[]>`
    SELECT c.id, c.user_id, p.name AS author, c.body AS text, c.created_at
    FROM room_chat_messages c
    JOIN profiles p ON p.user_id = c.user_id
    WHERE c.room_id = ${roomId}::uuid
    ORDER BY c.created_at DESC, c.id DESC
    LIMIT 100
  `
  return rows.reverse()
}

export async function insertChat(
  roomId: string,
  userId: string,
  text: string,
  db: SQL = getSql(),
): Promise<RoomChatRow> {
  const rows = await db<RoomChatRow[]>`
    INSERT INTO room_chat_messages (room_id, user_id, body)
    VALUES (${roomId}::uuid, ${userId}::uuid, ${text})
    RETURNING id, user_id, (SELECT name FROM profiles WHERE user_id = ${userId}::uuid) AS author,
      body AS text, created_at
  `
  const row = rows[0]
  if (!row) throw new Error('insert chat message failed')
  return row
}

export async function listWhiteboardStrokes(roomId: string, db: SQL = getSql()): Promise<RoomWhiteboardStrokeRow[]> {
  return db<RoomWhiteboardStrokeRow[]>`
    SELECT id, user_id, color, width, points, created_at
    FROM room_whiteboard_strokes
    WHERE room_id = ${roomId}::uuid
    ORDER BY created_at ASC, id ASC
  `
}

export async function insertWhiteboardStroke(
  roomId: string,
  userId: string,
  stroke: { color: string; width: number; points: { x: number; y: number }[] },
  db: SQL = getSql(),
): Promise<RoomWhiteboardStrokeRow> {
  const rows = await db<RoomWhiteboardStrokeRow[]>`
    INSERT INTO room_whiteboard_strokes (room_id, user_id, color, width, points)
    VALUES (${roomId}::uuid, ${userId}::uuid, ${stroke.color}, ${stroke.width}, ${JSON.stringify(stroke.points)}::text::jsonb)
    RETURNING id, user_id, color, width, points, created_at
  `
  const row = rows[0]
  if (!row) throw new Error('insert whiteboard stroke failed')
  return row
}

export async function clearWhiteboard(roomId: string, db: SQL = getSql()): Promise<void> {
  await db`DELETE FROM room_whiteboard_strokes WHERE room_id = ${roomId}::uuid`
}

export async function undoWhiteboardStroke(roomId: string, userId: string, db: SQL = getSql()): Promise<string | null> {
  const rows = await db<{ id: string }[]>`
    WITH target AS (
      SELECT id
      FROM room_whiteboard_strokes
      WHERE room_id = ${roomId}::uuid AND user_id = ${userId}::uuid
      ORDER BY created_at DESC, id DESC
      LIMIT 1
      FOR UPDATE
    )
    DELETE FROM room_whiteboard_strokes stroke
    USING target
    WHERE stroke.id = target.id
    RETURNING stroke.id
  `
  return rows[0]?.id ?? null
}

export async function getPlaybackState(roomId: string, db: SQL = getSql()): Promise<RoomPlaybackStateRow | null> {
  const rows = await db<RoomPlaybackStateRow[]>`
    SELECT s.video_id, s.is_playing, s.position_seconds, s.controller_id,
      p.name AS controller_name, s.updated_at
    FROM room_playback_state s
    JOIN profiles p ON p.user_id = s.controller_id
    WHERE s.room_id = ${roomId}::uuid
    LIMIT 1
  `
  return rows[0] ?? null
}

export async function savePlaybackState(
  roomId: string,
  userId: string,
  state: { videoId: string; isPlaying: boolean; positionSeconds: number },
  db: SQL = getSql(),
): Promise<RoomPlaybackStateRow> {
  await db`
    INSERT INTO room_playback_state (room_id, video_id, is_playing, position_seconds, controller_id, updated_at)
    VALUES (${roomId}::uuid, ${state.videoId}, ${state.isPlaying}, ${state.positionSeconds}, ${userId}::uuid, now())
    ON CONFLICT (room_id) DO UPDATE SET
      video_id = EXCLUDED.video_id,
      is_playing = EXCLUDED.is_playing,
      position_seconds = EXCLUDED.position_seconds,
      controller_id = EXCLUDED.controller_id,
      updated_at = EXCLUDED.updated_at
  `
  const result = await getPlaybackState(roomId, db)
  if (!result) throw new Error('save playback state failed')
  return result
}
