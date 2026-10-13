import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { supabaseUser } from '../../middleware/supabaseAuth'
import { rateLimit } from '../../middleware/rateLimit'
import * as service from './service'

const SessionBody = z.object({
  roomId: z.string().uuid(),
  title: z.string().trim().min(2).max(100),
  topic: z.string().trim().min(1).max(120),
  startsAt: z.string().datetime({ offset: true }),
  durationMin: z.number().int().min(15).max(240),
}).strict()

export const scheduleRoutes = new Hono()

scheduleRoutes.get(
  '/',
  rateLimit('room.live.read', (c) => String(c.get('clientIp'))),
  async (c) => {
    const user = await supabaseUser(c.req.header('Authorization'))
    return c.json({ items: await service.list(user.id) })
  },
)

scheduleRoutes.post(
  '/',
  rateLimit('schedule.write', (c) => String(c.get('clientIp'))),
  zValidator('json', SessionBody),
  async (c) => {
    const user = await supabaseUser(c.req.header('Authorization'))
    return c.json(await service.create(user.id, c.req.valid('json')), 201)
  },
)

scheduleRoutes.put(
  '/:id',
  rateLimit('schedule.write', (c) => String(c.get('clientIp'))),
  zValidator('param', z.object({ id: z.string().uuid() })),
  zValidator('json', SessionBody),
  async (c) => {
    const user = await supabaseUser(c.req.header('Authorization'))
    return c.json(await service.update(user.id, c.req.valid('param').id, c.req.valid('json')))
  },
)

scheduleRoutes.delete(
  '/:id',
  rateLimit('schedule.write', (c) => String(c.get('clientIp'))),
  zValidator('param', z.object({ id: z.string().uuid() })),
  async (c) => {
    const user = await supabaseUser(c.req.header('Authorization'))
    await service.remove(user.id, c.req.valid('param').id)
    return c.json({ ok: true })
  },
)
