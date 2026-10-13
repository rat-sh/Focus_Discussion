import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { SignJWT } from 'jose'
import { CreateRoomBody, JoinRoomBody, UpdateRoomBody } from '@studyroom/contract'
import { AppError } from '../../lib/errors'
import { env } from '../../config/env'
import { requireAuth } from '../../middleware/auth'
import { supabaseUser } from '../../middleware/supabaseAuth'
import { rateLimit } from '../../middleware/rateLimit'
import * as service from './service'
import * as repo from './repo'

export const roomRoutes = new Hono()

const WhiteboardPoint = z.object({
  x: z.number().finite().min(0).max(1000),
  y: z.number().finite().min(0).max(600),
}).strict()
const WhiteboardStrokeBody = z.object({
  color: z.string().regex(/^#[\da-fA-F]{6}$/),
  width: z.number().int().min(2).max(12),
  points: z.array(WhiteboardPoint).min(2).max(1000),
}).strict()
const PlaybackStateBody = z.object({
  videoId: z.string().regex(/^[A-Za-z0-9_-]{11}$/),
  isPlaying: z.boolean(),
  positionSeconds: z.number().finite().min(0).max(86400),
}).strict()

roomRoutes.get(
  '/preview/:code',
  rateLimit('room.preview', (c) => String(c.get('clientIp'))),
  zValidator('param', z.object({ code: z.string().min(4).max(16) })),
  async (c) => {
    const { code } = c.req.valid('param')
    return c.json(await service.preview(code))
  },
)

roomRoutes.post(
  '/:id/token',
  rateLimit('room.token', (c) => String(c.get('clientIp'))),
  zValidator('param', z.object({ id: z.string().uuid() })),
  async (c) => {
    const config = env()
    if (!config.LIVEKIT_URL || !config.LIVEKIT_API_KEY || !config.LIVEKIT_API_SECRET) {
      throw new AppError('INTERNAL', 'LiveKit is not configured', 503)
    }

    const user = await supabaseUser(c.req.header('Authorization'))
    const roomId = c.req.valid('param').id
    const membership = await repo.isMember(roomId, user.id)
    if (!membership) throw AppError.forbidden('Join the room before requesting a video token')
    const name = await repo.profileName(user.id) ?? user.name

    const now = Math.floor(Date.now() / 1000)
    const token = await new SignJWT({
      name,
      video: {
        roomJoin: true,
        room: roomId,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
      },
    })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuer(config.LIVEKIT_API_KEY)
      .setSubject(user.id)
      .setIssuedAt(now)
      .setNotBefore(now)
      .setExpirationTime(now + 15 * 60)
      .sign(new TextEncoder().encode(config.LIVEKIT_API_SECRET))
    return c.json({ token, url: config.LIVEKIT_URL })
  },
)

roomRoutes.get(
  '/:id/chat',
  rateLimit('room.live.read', (c) => String(c.get('clientIp'))),
  zValidator('param', z.object({ id: z.string().uuid() })),
  async (c) => {
    const user = await supabaseUser(c.req.header('Authorization'))
    return c.json({ items: await service.chat(user.id, c.req.valid('param').id) })
  },
)

roomRoutes.post(
  '/:id/chat',
  rateLimit('room.live.write', (c) => String(c.get('clientIp'))),
  zValidator('param', z.object({ id: z.string().uuid() })),
  zValidator('json', z.object({ text: z.string().trim().min(1).max(2000) })),
  async (c) => {
    const user = await supabaseUser(c.req.header('Authorization'))
    const { id } = c.req.valid('param')
    return c.json(await service.sendChat(user.id, id, c.req.valid('json').text), 201)
  },
)

roomRoutes.get(
  '/:id/board',
  rateLimit('room.live.read', (c) => String(c.get('clientIp'))),
  zValidator('param', z.object({ id: z.string().uuid() })),
  async (c) => {
    const user = await supabaseUser(c.req.header('Authorization'))
    return c.json({ items: await service.whiteboard(user.id, c.req.valid('param').id) })
  },
)

roomRoutes.post(
  '/:id/board/strokes',
  rateLimit('room.live.board.write', (c) => String(c.get('clientIp'))),
  zValidator('param', z.object({ id: z.string().uuid() })),
  zValidator('json', WhiteboardStrokeBody),
  async (c) => {
    const user = await supabaseUser(c.req.header('Authorization'))
    return c.json(await service.addWhiteboardStroke(user.id, c.req.valid('param').id, c.req.valid('json')), 201)
  },
)

roomRoutes.delete(
  '/:id/board',
  rateLimit('room.live.board.write', (c) => String(c.get('clientIp'))),
  zValidator('param', z.object({ id: z.string().uuid() })),
  async (c) => {
    const user = await supabaseUser(c.req.header('Authorization'))
    await service.clearRoomWhiteboard(user.id, c.req.valid('param').id)
    return c.json({ ok: true })
  },
)

roomRoutes.post(
  '/:id/board/undo',
  rateLimit('room.live.board.write', (c) => String(c.get('clientIp'))),
  zValidator('param', z.object({ id: z.string().uuid() })),
  async (c) => {
    const user = await supabaseUser(c.req.header('Authorization'))
    const strokeId = await service.undoWhiteboard(user.id, c.req.valid('param').id)
    return c.json({ strokeId })
  },
)

roomRoutes.get(
  '/:id/playback',
  rateLimit('room.live.read', (c) => String(c.get('clientIp'))),
  zValidator('param', z.object({ id: z.string().uuid() })),
  async (c) => {
    const user = await supabaseUser(c.req.header('Authorization'))
    return c.json({ state: await service.playbackState(user.id, c.req.valid('param').id) })
  },
)

roomRoutes.put(
  '/:id/playback',
  rateLimit('room.live.playback.write', (c) => String(c.get('clientIp'))),
  zValidator('param', z.object({ id: z.string().uuid() })),
  zValidator('json', PlaybackStateBody),
  async (c) => {
    const user = await supabaseUser(c.req.header('Authorization'))
    return c.json(await service.savePlaybackState(user.id, c.req.valid('param').id, c.req.valid('json')))
  },
)

roomRoutes.use('*', requireAuth)

roomRoutes.get('/', async (c) => {
  const user = c.get('user')
  if (!user) throw AppError.unauthenticated()
  return c.json({ items: await service.listMine(user.id) })
})

roomRoutes.post('/', zValidator('json', CreateRoomBody), async (c) => {
  const user = c.get('user')
  if (!user) throw AppError.unauthenticated()
  const body = c.req.valid('json')
  return c.json(await service.create(user.id, body), 201)
})

roomRoutes.get('/:id', zValidator('param', z.object({ id: z.string().uuid() })), async (c) => {
  const user = c.get('user')
  if (!user) throw AppError.unauthenticated()
  return c.json(await service.get(user.id, c.req.valid('param').id))
})

roomRoutes.patch(
  '/:id',
  zValidator('param', z.object({ id: z.string().uuid() })),
  zValidator('json', UpdateRoomBody),
  async (c) => {
    const user = c.get('user')
    if (!user) throw AppError.unauthenticated()
    return c.json(await service.update(user.id, c.req.valid('param').id, c.req.valid('json')))
  },
)

roomRoutes.delete('/:id', zValidator('param', z.object({ id: z.string().uuid() })), async (c) => {
  const user = c.get('user')
  if (!user) throw AppError.unauthenticated()
  await service.remove(user.id, c.req.valid('param').id)
  return c.json({ ok: true })
})

roomRoutes.post(
  '/join',
  rateLimit('room.join.ip', (c) => String(c.get('clientIp'))),
  rateLimit('room.join.user', (c) => {
    const u = c.get('user') as { id: string } | undefined
    return u?.id ?? String(c.get('clientIp'))
  }),
  zValidator('json', JoinRoomBody),
  async (c) => {
    const user = c.get('user')
    if (!user) throw AppError.unauthenticated()
    return c.json(await service.join(user.id, c.req.valid('json').code))
  },
)

roomRoutes.post('/:id/leave', zValidator('param', z.object({ id: z.string().uuid() })), async (c) => {
  const user = c.get('user')
  if (!user) throw AppError.unauthenticated()
  await service.leave(user.id, c.req.valid('param').id)
  return c.json({ ok: true })
})

roomRoutes.get('/:id/members', zValidator('param', z.object({ id: z.string().uuid() })), async (c) => {
  const user = c.get('user')
  if (!user) throw AppError.unauthenticated()
  return c.json({ items: await service.members(user.id, c.req.valid('param').id) })
})
