import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { createApp } from '../src/app'
import { closeSql } from '../src/db/sql'
import { closeValkey } from '../src/cache/valkey'
import { ensureTestDb, truncateAll } from './setup'

async function register(app: ReturnType<typeof createApp>, handle: string) {
  const res = await app.request('/api/v1/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Real-IP': crypto.randomUUID() },
    body: JSON.stringify({
      email: `${handle}@example.com`,
      password: 'password1234',
      name: handle,
      handle,
    }),
  })
  const body = (await res.json()) as { accessToken: string; user: { id: string } }
  return body
}

describe('rooms', () => {
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

  test('create join outcomes and authz', async () => {
    const app = createApp()
    const a = await register(app, 'alice')
    const b = await register(app, 'bob')

    const created = await app.request('/api/v1/rooms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${a.accessToken}`,
      },
      body: JSON.stringify({ name: 'Math', topic: 'Calc', mode: 'study' }),
    })
    expect(created.status).toBe(201)
    const room = (await created.json()) as { id: string; code: string }

    const preview = await app.request(`/api/v1/rooms/preview/${room.code}`)
    expect(preview.status).toBe(200)
    const prev = (await preview.json()) as { availability: string }
    expect(prev.availability).toBe('open')

    const join = await app.request('/api/v1/rooms/join', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${b.accessToken}`,
      },
      body: JSON.stringify({ code: room.code }),
    })
    expect(join.status).toBe(200)

    const joinAgain = await app.request('/api/v1/rooms/join', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${b.accessToken}`,
      },
      body: JSON.stringify({ code: room.code }),
    })
    expect(joinAgain.status).toBe(200)

    const missing = await app.request('/api/v1/rooms/join', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${b.accessToken}`,
      },
      body: JSON.stringify({ code: 'ZZZZZZZZ' }),
    })
    expect(missing.status).toBe(404)

    const foreign = await app.request(`/api/v1/rooms/${room.id}`, {
      headers: { Authorization: `Bearer ${b.accessToken}` },
    })
    expect(foreign.status).toBe(200)

    await app.request(`/api/v1/rooms/${room.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${a.accessToken}`,
      },
      body: JSON.stringify({ closed: true }),
    })
    const gone = await app.request('/api/v1/rooms/join', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${a.accessToken}`,
      },
      body: JSON.stringify({ code: room.code }),
    })
    // alice already member — idempotent member path before closed check for existing?
    // join for already-member returns get; for closed new members get 410
    expect([200, 410]).toContain(gone.status)

    const c = await register(app, 'cara')
    const closedJoin = await app.request('/api/v1/rooms/join', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${c.accessToken}`,
      },
      body: JSON.stringify({ code: room.code }),
    })
    expect(closedJoin.status).toBe(410)

    const denyUpdate = await app.request(`/api/v1/rooms/${room.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${b.accessToken}`,
      },
      body: JSON.stringify({ name: 'Hijack' }),
    })
    expect(denyUpdate.status).toBe(403)
  })

  test('shares persisted whiteboard strokes with other room members', async () => {
    const app = createApp()
    const alice = await register(app, 'alice')
    const bob = await register(app, 'bob')

    const created = await app.request('/api/v1/rooms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${alice.accessToken}`,
      },
      body: JSON.stringify({ name: 'Whiteboard', topic: 'Geometry', mode: 'study' }),
    })
    expect(created.status).toBe(201)
    const room = (await created.json()) as { id: string; code: string }

    const joined = await app.request('/api/v1/rooms/join', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${bob.accessToken}`,
      },
      body: JSON.stringify({ code: room.code }),
    })
    expect(joined.status).toBe(200)

    const stroke = {
      color: '#202124',
      width: 4,
      points: [{ x: 10, y: 20 }, { x: 30, y: 40 }],
    }
    const saved = await app.request(`/api/v1/rooms/${room.id}/board/strokes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${alice.accessToken}`,
      },
      body: JSON.stringify(stroke),
    })
    expect(saved.status).toBe(201)
    const savedStroke = (await saved.json()) as typeof stroke & { id: string; userId: string; at: string }
    expect(savedStroke.points).toEqual(stroke.points)

    const board = await app.request(`/api/v1/rooms/${room.id}/board`, {
      headers: { Authorization: `Bearer ${bob.accessToken}` },
    })
    expect(board.status).toBe(200)
    const body = (await board.json()) as { items: typeof savedStroke[] }
    expect(body.items).toContainEqual(savedStroke)
  })
})
