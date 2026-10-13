import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { setCookie, deleteCookie } from 'hono/cookie'
import { LoginBody, PatchProfileBody, RegisterBody } from '@studyroom/contract'
import { env } from '../../config/env'
import { AppError } from '../../lib/errors'
import { requireAuth } from '../../middleware/auth'
import { rateLimit } from '../../middleware/rateLimit'
import * as service from './service'

export const authRoutes = new Hono()

function requireXhr(c: { req: { header: (n: string) => string | undefined } }): void {
  if (c.req.header('X-Requested-With') !== 'studyroom') {
    throw AppError.forbidden('Missing X-Requested-With')
  }
}

authRoutes.post(
  '/register',
  rateLimit('auth.register', (c) => String(c.get('clientIp'))),
  zValidator('json', RegisterBody),
  async (c) => {
    const body = c.req.valid('json')
    const { dto, refreshRaw } = await service.register(body)
    setCookie(c, service.refreshCookieName(), refreshRaw, service.refreshCookieOptions(env().REFRESH_TOKEN_TTL_SEC))
    return c.json(dto, 201)
  },
)

authRoutes.post(
  '/login',
  rateLimit('auth.login', (c) => {
    // body not parsed yet — key by IP; service still validates credentials
    return String(c.get('clientIp'))
  }),
  zValidator('json', LoginBody),
  async (c) => {
    const body = c.req.valid('json')
    const { dto, refreshRaw } = await service.login(body)
    setCookie(c, service.refreshCookieName(), refreshRaw, service.refreshCookieOptions(env().REFRESH_TOKEN_TTL_SEC))
    return c.json(dto)
  },
)

authRoutes.post('/refresh', async (c) => {
  requireXhr(c)
  const cookies = service.parseCookies(c.req.header('Cookie'))
  const raw = cookies[service.refreshCookieName()]
  if (!raw) throw AppError.unauthenticated()
  const { dto, refreshRaw } = await service.refresh(raw)
  setCookie(c, service.refreshCookieName(), refreshRaw, service.refreshCookieOptions(env().REFRESH_TOKEN_TTL_SEC))
  return c.json(dto)
})

authRoutes.post('/logout', async (c) => {
  const cookies = service.parseCookies(c.req.header('Cookie'))
  const raw = cookies[service.refreshCookieName()]
  const header = c.req.header('Authorization')
  const accessToken = header?.startsWith('Bearer ') ? header.slice(7) : undefined
  await service.logout(raw, accessToken)
  deleteCookie(c, service.refreshCookieName(), service.clearRefreshCookieOptions())
  return c.json({ ok: true })
})

authRoutes.get('/me', requireAuth, async (c) => {
  const user = c.get('user')
  if (!user) throw AppError.unauthenticated()
  return c.json(await service.me(user.id, user.email))
})

authRoutes.patch('/me', requireAuth, zValidator('json', PatchProfileBody), async (c) => {
  const user = c.get('user')
  if (!user) throw AppError.unauthenticated()
  const body = c.req.valid('json')
  return c.json(await service.patchMe(user.id, user.email, body))
})
