import type { RoomDto, RoomMemberDto, RoomPreviewDto } from '@studyroom/contract'
import { AppError } from '../../lib/errors'
import { randomInviteCode } from '../../lib/ids'
import * as repo from './repo'

function toDto(row: repo.RoomRow): RoomDto {
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
    lastSessionAt: row.last_session_at ? new Date(row.last_session_at).toISOString() : null,
  }
}

async function uniqueCode(): Promise<string> {
  for (let i = 0; i < 8; i++) {
    const code = randomInviteCode(8)
    if (!(await repo.codeExists(code))) return code
  }
  throw AppError.internal('Could not allocate invite code')
}

export async function create(
  userId: string,
  input: { name: string; topic: string; mode: 'study' | 'teach' },
): Promise<RoomDto> {
  const code = await uniqueCode()
  const row = await repo.createRoom({
    code,
    name: input.name,
    topic: input.topic,
    mode: input.mode,
    ownerId: userId,
  })
  return toDto(row)
}

export async function listMine(userId: string): Promise<RoomDto[]> {
  return (await repo.listMine(userId)).map(toDto)
}

export async function get(userId: string, roomId: string): Promise<RoomDto> {
  const row = await repo.getRoomForUser(roomId, userId)
  if (!row) throw AppError.notFound('Room not found')
  return toDto(row)
}

export async function update(
  userId: string,
  roomId: string,
  patch: { name?: string; topic?: string; closed?: boolean },
): Promise<RoomDto> {
  const existing = await repo.getRoomForUser(roomId, userId)
  if (!existing) throw AppError.notFound('Room not found')
  if (existing.membership !== 'owner') throw AppError.forbidden('Owner only')
  await repo.updateRoom(roomId, patch)
  return get(userId, roomId)
}

export async function remove(userId: string, roomId: string): Promise<void> {
  const existing = await repo.getRoomForUser(roomId, userId)
  if (!existing) throw AppError.notFound('Room not found')
  if (existing.membership !== 'owner') throw AppError.forbidden('Owner only')
  await repo.deleteRoom(roomId)
}

export async function preview(code: string): Promise<RoomPreviewDto> {
  const room = await repo.findByCode(code)
  if (!room) {
    return {
      code: code.toUpperCase(),
      name: '',
      hostName: '',
      mode: 'study',
      insideCount: 0,
      availability: 'not-found',
    }
  }
  let availability: RoomPreviewDto['availability'] = 'open'
  if (room.closed) availability = 'expired'
  else if (room.expires_at && new Date(room.expires_at).getTime() < Date.now()) availability = 'expired'
  else if (room.member_count >= room.max_members) availability = 'full'
  return {
    code: room.code,
    name: room.name,
    hostName: room.owner_name,
    mode: room.mode,
    insideCount: room.member_count,
    availability,
  }
}

export async function join(userId: string, code: string): Promise<RoomDto> {
  const room = await repo.findByCode(code)
  if (!room) throw AppError.notFound('Room not found')
  if (await repo.isMember(room.id, userId)) {
    return get(userId, room.id)
  }
  if (room.closed || (room.expires_at && new Date(room.expires_at).getTime() < Date.now())) {
    throw AppError.gone('Room closed or expired')
  }
  if (room.member_count >= room.max_members) {
    throw AppError.conflict('Room is full')
  }
  await repo.addMember(room.id, userId)
  return get(userId, room.id)
}

export async function leave(userId: string, roomId: string): Promise<void> {
  const existing = await repo.getRoomForUser(roomId, userId)
  if (!existing) throw AppError.notFound('Room not found')
  if (existing.membership === 'owner') throw AppError.forbidden('Owner cannot leave; delete the room')
  await repo.removeMember(roomId, userId)
}

export async function members(userId: string, roomId: string): Promise<RoomMemberDto[]> {
  const existing = await repo.getRoomForUser(roomId, userId)
  if (!existing) throw AppError.notFound('Room not found')
  const rows = await repo.listMembers(roomId)
  return rows.map((r) => ({
    userId: r.user_id,
    name: r.name,
    handle: r.handle,
    role: r.role,
    joinedAt: new Date(r.joined_at).toISOString(),
  }))
}

export interface ChatMessageDto {
  id: string
  userId: string
  author: string
  text: string
  at: string
}

function toChatDto(row: repo.RoomChatRow): ChatMessageDto {
  return {
    id: row.id,
    userId: row.user_id,
    author: row.author,
    text: row.text,
    at: new Date(row.created_at).toISOString(),
  }
}

export async function chat(userId: string, roomId: string): Promise<ChatMessageDto[]> {
  const room = await repo.getRoomForUser(roomId, userId)
  if (!room) throw AppError.notFound('Room not found')
  return (await repo.listChat(roomId)).map(toChatDto)
}

export async function sendChat(userId: string, roomId: string, text: string): Promise<ChatMessageDto> {
  const room = await repo.getRoomForUser(roomId, userId)
  if (!room) throw AppError.notFound('Room not found')
  return toChatDto(await repo.insertChat(roomId, userId, text))
}

export interface WhiteboardStrokeDto {
  id: string
  userId: string
  color: string
  width: number
  points: { x: number; y: number }[]
  at: string
}

function toWhiteboardStrokeDto(row: repo.RoomWhiteboardStrokeRow): WhiteboardStrokeDto {
  return {
    id: row.id,
    userId: row.user_id,
    color: row.color,
    width: row.width,
    points: row.points,
    at: new Date(row.created_at).toISOString(),
  }
}

async function requireRoomMember(userId: string, roomId: string): Promise<void> {
  if (!(await repo.getRoomForUser(roomId, userId))) throw AppError.notFound('Room not found')
}

export async function whiteboard(userId: string, roomId: string): Promise<WhiteboardStrokeDto[]> {
  await requireRoomMember(userId, roomId)
  return (await repo.listWhiteboardStrokes(roomId)).map(toWhiteboardStrokeDto)
}

export async function addWhiteboardStroke(
  userId: string,
  roomId: string,
  stroke: { color: string; width: number; points: { x: number; y: number }[] },
): Promise<WhiteboardStrokeDto> {
  await requireRoomMember(userId, roomId)
  return toWhiteboardStrokeDto(await repo.insertWhiteboardStroke(roomId, userId, stroke))
}

export async function clearRoomWhiteboard(userId: string, roomId: string): Promise<void> {
  await requireRoomMember(userId, roomId)
  await repo.clearWhiteboard(roomId)
}

export async function undoWhiteboard(userId: string, roomId: string): Promise<string | null> {
  await requireRoomMember(userId, roomId)
  return repo.undoWhiteboardStroke(roomId, userId)
}

export interface PlaybackStateDto {
  videoId: string
  isPlaying: boolean
  positionSeconds: number
  controllerId: string
  controllerName: string
  updatedAt: string
}

function toPlaybackStateDto(row: repo.RoomPlaybackStateRow): PlaybackStateDto {
  return {
    videoId: row.video_id,
    isPlaying: row.is_playing,
    positionSeconds: row.position_seconds,
    controllerId: row.controller_id,
    controllerName: row.controller_name,
    updatedAt: new Date(row.updated_at).toISOString(),
  }
}

export async function playbackState(userId: string, roomId: string): Promise<PlaybackStateDto | null> {
  await requireRoomMember(userId, roomId)
  const state = await repo.getPlaybackState(roomId)
  return state ? toPlaybackStateDto(state) : null
}

export async function savePlaybackState(
  userId: string,
  roomId: string,
  state: { videoId: string; isPlaying: boolean; positionSeconds: number },
): Promise<PlaybackStateDto> {
  await requireRoomMember(userId, roomId)
  const saved = await repo.savePlaybackState(roomId, userId, {
    ...state,
    positionSeconds: Math.round(state.positionSeconds),
  })
  return toPlaybackStateDto(saved)
}
