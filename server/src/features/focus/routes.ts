import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { SavePlanBody, SegmentBatchBody, StartFocusBody, StopFocusBody } from '@studyroom/contract'
import { AppError } from '../../lib/errors'
import { requireAuth } from '../../middleware/auth'
import { rateLimit } from '../../middleware/rateLimit'
import * as service from './service'

export const focusRoutes = new Hono()
focusRoutes.use('*', requireAuth)

focusRoutes.get('/recent', async (c) => {
  const user = c.get('user')
  if (!user) throw AppError.unauthenticated()
  return c.json({ items: await service.recent(user.id) })
})

focusRoutes.get('/plan', async (c) => {
  const user = c.get('user')
  if (!user) throw AppError.unauthenticated()
  return c.json({ plan: await service.lastPlan(user.id) })
})

focusRoutes.put('/plan', rateLimit('write', (c) => (c.get('user') as { id: string }).id), zValidator('json', SavePlanBody), async (c) => {
  const user = c.get('user')
  if (!user) throw AppError.unauthenticated()
  return c.json(await service.savePlan(user.id, c.req.valid('json')))
})

focusRoutes.get('/stats/weekly', async (c) => {
  const user = c.get('user')
  if (!user) throw AppError.unauthenticated()
  return c.json(await service.weekly(user.id))
})

focusRoutes.post('/sessions', rateLimit('write', (c) => (c.get('user') as { id: string }).id), zValidator('json', StartFocusBody), async (c) => {
  const user = c.get('user')
  if (!user) throw AppError.unauthenticated()
  return c.json(await service.start(user.id, c.req.valid('json')), 201)
})

focusRoutes.get('/sessions/:id', zValidator('param', z.object({ id: z.string().uuid() })), async (c) => {
  const user = c.get('user')
  if (!user) throw AppError.unauthenticated()
  return c.json(await service.get(user.id, c.req.valid('param').id))
})

focusRoutes.post(
  '/sessions/:id/stop',
  zValidator('param', z.object({ id: z.string().uuid() })),
  zValidator('json', StopFocusBody),
  async (c) => {
    const user = c.get('user')
    if (!user) throw AppError.unauthenticated()
    return c.json(await service.stop(user.id, c.req.valid('param').id, c.req.valid('json').elapsedSec))
  },
)

focusRoutes.post(
  '/sessions/:id/segments',
  rateLimit('write', (c) => (c.get('user') as { id: string }).id),
  zValidator('param', z.object({ id: z.string().uuid() })),
  zValidator('json', SegmentBatchBody),
  async (c) => {
    const user = c.get('user')
    if (!user) throw AppError.unauthenticated()
    return c.json(await service.writeSegments(user.id, c.req.valid('param').id, c.req.valid('json').segments))
  },
)
