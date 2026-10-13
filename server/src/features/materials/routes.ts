import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { NewMaterialBody } from '@studyroom/contract'
import { AppError } from '../../lib/errors'
import { requireAuth } from '../../middleware/auth'
import { rateLimit } from '../../middleware/rateLimit'
import * as service from './service'

export const materialRoutes = new Hono()
materialRoutes.use('*', requireAuth)

materialRoutes.get('/', async (c) => {
  const user = c.get('user')
  if (!user) throw AppError.unauthenticated()
  return c.json({ items: await service.list(user.id) })
})

materialRoutes.post('/', rateLimit('write', (c) => (c.get('user') as { id: string }).id), zValidator('json', NewMaterialBody), async (c) => {
  const user = c.get('user')
  if (!user) throw AppError.unauthenticated()
  return c.json(await service.add(user.id, c.req.valid('json')), 201)
})

materialRoutes.delete('/:id', zValidator('param', z.object({ id: z.string().uuid() })), async (c) => {
  const user = c.get('user')
  if (!user) throw AppError.unauthenticated()
  await service.remove(user.id, c.req.valid('param').id)
  return c.json({ ok: true })
})
