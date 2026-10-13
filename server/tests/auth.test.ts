import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { createApp } from '../src/app'
import { closeSql } from '../src/db/sql'
import { closeValkey } from '../src/cache/valkey'
import { ensureTestDb, truncateAll } from './setup'

function cookieFrom(res: Response): string {
  const raw = res.headers.getSetCookie()
  const parts = raw.length > 0 ? raw : [res.headers.get('set-cookie') ?? '']
  return parts
    .map((c) => c.split(';')[0] ?? '')
    .filter(Boolean)
    .join('; ')
}

describe('auth', () => {
  beforeAll(async () => {
    await ensureTestDb()
  })
  beforeEach(async () => {
    await truncateAll()
  })
  afterAll(async () => {
    await closeSql()
    closeValkey()
  })

  test('register login me refresh rotation reuse revoke logout', async () => {
    const app = createApp()
    const reg = await app.request('/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Real-IP': crypto.randomUUID() },
      body: JSON.stringify({
        email: 'a@example.com',
        password: 'password1234',
        name: 'Ada',
        handle: 'ada',
      }),
    })
    expect(reg.status).toBe(201)
    const regBody = (await reg.json()) as { accessToken: string; user: { handle: string } }
    expect(regBody.user.handle).toBe('ada')
    const cookie1 = cookieFrom(reg)

    const me = await app.request('/api/v1/auth/me', {
      headers: { Authorization: `Bearer ${regBody.accessToken}` },
    })
    expect(me.status).toBe(200)

    const refresh = await app.request('/api/v1/auth/refresh', {
      method: 'POST',
      headers: { Cookie: cookie1, 'X-Requested-With': 'studyroom' },
    })
    expect(refresh.status).toBe(200)
    const refreshBody = (await refresh.json()) as { accessToken: string }
    expect(refreshBody.accessToken).toBeTruthy()
    const cookie2 = cookieFrom(refresh)

    const reuse = await app.request('/api/v1/auth/refresh', {
      method: 'POST',
      headers: { Cookie: cookie1, 'X-Requested-With': 'studyroom' },
    })
    expect(reuse.status).toBe(401)

    const afterReuse = await app.request('/api/v1/auth/refresh', {
      method: 'POST',
      headers: { Cookie: cookie2, 'X-Requested-With': 'studyroom' },
    })
    expect(afterReuse.status).toBe(401)

    const login = await app.request('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'a@example.com', password: 'password1234' }),
    })
    expect(login.status).toBe(200)
    const loginCookie = cookieFrom(login)
    const loginBody = (await login.json()) as { accessToken: string }

    const logout = await app.request('/api/v1/auth/logout', {
      method: 'POST',
      headers: { Cookie: loginCookie, Authorization: `Bearer ${loginBody.accessToken}` },
    })
    expect(logout.status).toBe(200)

    const bad = await app.request('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'a@example.com', password: 'wrongpassword' }),
    })
    expect(bad.status).toBe(401)
    const badBody = (await bad.json()) as { error: { message: string } }
    expect(badBody.error.message).toBe('Invalid credentials')
  })
})
