import { z } from 'zod'
import { ApiError } from '@/shared/lib/apiError'
import { supabaseApiRequest } from '@/data/supabase/request'

const TokenResponse = z.object({ token: z.string().min(1), url: z.string().url() })
const ChatMessage = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  author: z.string(),
  text: z.string(),
  at: z.string(),
})
const ChatPacket = z.object({ type: z.literal('chat'), message: ChatMessage })
const BoardPoint = z.object({ x: z.number().min(0).max(1000), y: z.number().min(0).max(600) })
const WhiteboardStroke = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  color: z.string().regex(/^#[\da-fA-F]{6}$/),
  width: z.number().int().min(2).max(12),
  points: z.array(BoardPoint).min(2).max(1000),
  at: z.string(),
})
const BoardPacket = z.discriminatedUnion('type', [
  z.object({ type: z.literal('stroke'), stroke: WhiteboardStroke }),
  z.object({ type: z.literal('clear') }),
  z.object({ type: z.literal('undo'), strokeId: z.string().uuid() }),
])
const PlaybackState = z.object({
  videoId: z.string().regex(/^[A-Za-z0-9_-]{11}$/),
  isPlaying: z.boolean(),
  positionSeconds: z.number().nonnegative(),
  controllerId: z.string().uuid(),
  controllerName: z.string(),
  updatedAt: z.string(),
})
const PlaybackPacket = z.object({ type: z.literal('state'), state: PlaybackState })

export type LiveChatMessage = z.infer<typeof ChatMessage>
export type LiveWhiteboardStroke = z.infer<typeof WhiteboardStroke>
export type LiveWhiteboardStrokeInput = Omit<LiveWhiteboardStroke, 'id' | 'userId' | 'at'>
export type LiveWhiteboardEvent = z.infer<typeof BoardPacket>
export type LivePlaybackState = z.infer<typeof PlaybackState>
export type LivePlaybackStateInput = Pick<LivePlaybackState, 'videoId' | 'isPlaying' | 'positionSeconds'>
export const LIVE_CHAT_TOPIC = 'studyroom.chat.v1'
export const LIVE_BOARD_TOPIC = 'studyroom.board.v1'
export const LIVE_PLAYBACK_TOPIC = 'studyroom.playback.v1'

export async function requestLiveKitToken(roomId: string) {
  const body = await supabaseApiRequest(`/api/v1/rooms/${encodeURIComponent(roomId)}/token`, { method: 'POST' })
  const parsed = TokenResponse.safeParse(body)
  if (!parsed.success) throw new ApiError('INTERNAL', 'Video service returned an invalid token response', 502)
  return parsed.data
}

export async function loadLiveChat(roomId: string): Promise<LiveChatMessage[]> {
  const body = await supabaseApiRequest(`/api/v1/rooms/${encodeURIComponent(roomId)}/chat`)
  const parsed = z.object({ items: z.array(ChatMessage) }).safeParse(body)
  if (!parsed.success) throw new ApiError('INTERNAL', 'Chat service returned invalid messages', 502)
  return parsed.data.items
}

export async function sendLiveChat(roomId: string, text: string): Promise<LiveChatMessage> {
  const body = await supabaseApiRequest(`/api/v1/rooms/${encodeURIComponent(roomId)}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })
  const parsed = ChatMessage.safeParse(body)
  if (!parsed.success) throw new ApiError('INTERNAL', 'Chat service returned an invalid message', 502)
  return parsed.data
}

export async function loadLiveWhiteboard(roomId: string): Promise<LiveWhiteboardStroke[]> {
  const body = await supabaseApiRequest(`/api/v1/rooms/${encodeURIComponent(roomId)}/board`)
  const parsed = z.object({ items: z.array(WhiteboardStroke) }).safeParse(body)
  if (!parsed.success) throw new ApiError('INTERNAL', 'Whiteboard service returned invalid strokes', 502)
  return parsed.data.items
}

export async function addLiveWhiteboardStroke(roomId: string, stroke: LiveWhiteboardStrokeInput): Promise<LiveWhiteboardStroke> {
  const body = await supabaseApiRequest(`/api/v1/rooms/${encodeURIComponent(roomId)}/board/strokes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(stroke),
  })
  const parsed = WhiteboardStroke.safeParse(body)
  if (!parsed.success) throw new ApiError('INTERNAL', 'Whiteboard service returned an invalid stroke', 502)
  return parsed.data
}

export async function clearLiveWhiteboard(roomId: string): Promise<void> {
  await supabaseApiRequest(`/api/v1/rooms/${encodeURIComponent(roomId)}/board`, { method: 'DELETE' })
}

export async function undoLiveWhiteboard(roomId: string): Promise<string | null> {
  const body = await supabaseApiRequest(`/api/v1/rooms/${encodeURIComponent(roomId)}/board/undo`, { method: 'POST' })
  const parsed = z.object({ strokeId: z.string().uuid().nullable() }).safeParse(body)
  if (!parsed.success) throw new ApiError('INTERNAL', 'Whiteboard service returned an invalid undo response', 502)
  return parsed.data.strokeId
}

export async function loadLivePlayback(roomId: string): Promise<LivePlaybackState | null> {
  const body = await supabaseApiRequest(`/api/v1/rooms/${encodeURIComponent(roomId)}/playback`)
  const parsed = z.object({ state: PlaybackState.nullable() }).safeParse(body)
  if (!parsed.success) throw new ApiError('INTERNAL', 'Playback service returned invalid state', 502)
  return parsed.data.state
}

export async function saveLivePlayback(roomId: string, state: LivePlaybackStateInput): Promise<LivePlaybackState> {
  const body = await supabaseApiRequest(`/api/v1/rooms/${encodeURIComponent(roomId)}/playback`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(state),
  })
  const parsed = PlaybackState.safeParse(body)
  if (!parsed.success) throw new ApiError('INTERNAL', 'Playback service returned invalid state', 502)
  return parsed.data
}

export function encodeLiveChat(message: LiveChatMessage): Uint8Array {
  return new TextEncoder().encode(JSON.stringify({ type: 'chat', message }))
}

export function encodeLiveBoardEvent(event: LiveWhiteboardEvent): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(event))
}

export function encodeLivePlaybackState(state: LivePlaybackState): Uint8Array {
  return new TextEncoder().encode(JSON.stringify({ type: 'state', state }))
}

export function decodeLiveChat(payload: Uint8Array): LiveChatMessage | null {
  try {
    const parsed = ChatPacket.safeParse(JSON.parse(new TextDecoder().decode(payload)))
    return parsed.success ? parsed.data.message : null
  } catch {
    return null
  }
}

export function decodeLiveBoardEvent(payload: Uint8Array): LiveWhiteboardEvent | null {
  try {
    const parsed = BoardPacket.safeParse(JSON.parse(new TextDecoder().decode(payload)))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

export function decodeLivePlaybackState(payload: Uint8Array): LivePlaybackState | null {
  try {
    const parsed = PlaybackPacket.safeParse(JSON.parse(new TextDecoder().decode(payload)))
    return parsed.success ? parsed.data.state : null
  } catch {
    return null
  }
}
