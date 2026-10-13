import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { RespondFriendBody, SendFriendRequestBody } from '@studyroom/contract'
import { AppError } from '../../lib/errors'
import { requireAuth } from '../../middleware/auth'
import { rateLimit } from '../../middleware/rateLimit'
import * as service from './service'

export const friendRoutes = new Hono()
friendRoutes.use('*', requireAuth)

friendRoutes.get('/', async (c) => {
  const user = c.get('user')
  if (!user) throw AppError.unauthenticated()
  return c.json({ items: await service.list(user.id) })
})

friendRoutes.get('/requests', async (c) => {
  const user = c.get('user')
  if (!user) throw AppError.unauthenticated()
  return c.json({ items: await service.requests(user.id) })
})

friendRoutes.get(
  '/search',
  rateLimit('search', (c) => {
    const u = c.get('user') as { id: string } | undefined
    return u?.id ?? 'anon'
  }),
  zValidator('query', z.object({ q: z.string().min(1).max(60) })),
  async (c) => {
    const user = c.get('user')
    if (!user) throw AppError.unauthenticated()
    return c.json({ items: await service.search(user.id, c.req.valid('query').q) })
  },
)

friendRoutes.post('/requests', rateLimit('write', (c) => (c.get('user') as { id: string }).id), zValidator('json', SendFriendRequestBody), async (c) => {
  const user = c.get('user')
  if (!user) throw AppError.unauthenticated()
  await service.sendRequest(user.id, c.req.valid('json').userId)
  return c.json({ ok: true }, 201)
})

friendRoutes.post(
  '/requests/:id/respond',
  zValidator('param', z.object({ id: z.string().uuid() })),
  zValidator('json', RespondFriendBody),
  async (c) => {
    const user = c.get('user')
    if (!user) throw AppError.unauthenticated()
    await service.respond(user.id, c.req.valid('param').id, c.req.valid('json').accept)
    return c.json({ ok: true })
  },
)

friendRoutes.delete('/requests/:id', zValidator('param', z.object({ id: z.string().uuid() })), async (c) => {
  const user = c.get('user')
  if (!user) throw AppError.unauthenticated()
  await service.cancel(user.id, c.req.valid('param').id)
  return c.json({ ok: true })
})

friendRoutes.delete('/:friendId', zValidator('param', z.object({ friendId: z.string().uuid() })), async (c) => {
  const user = c.get('user')
  if (!user) throw AppError.unauthenticated()
  await service.remove(user.id, c.req.valid('param').friendId)
  return c.json({ ok: true })
})
