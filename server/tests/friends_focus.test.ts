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
  return (await res.json()) as { accessToken: string; user: { id: string } }
}

describe('friends and focus', () => {
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

  test('friends state machine', async () => {
    const app = createApp()
    const a = await register(app, 'alice')
    const b = await register(app, 'bob')

    const send = await app.request('/api/v1/friends/requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${a.accessToken}`,
      },
      body: JSON.stringify({ userId: b.user.id }),
    })
    expect(send.status).toBe(201)

    const reqs = await app.request('/api/v1/friends/requests', {
      headers: { Authorization: `Bearer ${b.accessToken}` },
    })
    const list = (await reqs.json()) as { items: { id: string }[] }
    expect(list.items.length).toBe(1)
    const id = list.items[0]?.id
    if (!id) throw new Error('Expected a friend request in the test response')

    const accept = await app.request(`/api/v1/friends/requests/${id}/respond`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${b.accessToken}`,
      },
      body: JSON.stringify({ accept: true }),
    })
    expect(accept.status).toBe(200)

    const friends = await app.request('/api/v1/friends', {
      headers: { Authorization: `Bearer ${a.accessToken}` },
    })
    const fl = (await friends.json()) as { items: unknown[] }
    expect(fl.items.length).toBe(1)
  })

  test('segment idempotency and ownership', async () => {
    const app = createApp()
    const a = await register(app, 'alice')
    const b = await register(app, 'bob')

    const start = await app.request('/api/v1/focus/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${a.accessToken}`,
      },
      body: JSON.stringify({ title: 'Study', plannedMin: 25, links: [] }),
    })
    expect(start.status).toBe(201)
    const session = (await start.json()) as { id: string }

    const body = {
      segments: [
        { clientSegmentId: 'c1', state: 'focused', startSec: 0, endSec: 10 },
        { clientSegmentId: 'c2', state: 'resting', startSec: 10, endSec: 20 },
      ],
    }
    const w1 = await app.request(`/api/v1/focus/sessions/${session.id}/segments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${a.accessToken}`,
      },
      body: JSON.stringify(body),
    })
    expect(w1.status).toBe(200)
    expect(((await w1.json()) as { inserted: number }).inserted).toBe(2)

    const w2 = await app.request(`/api/v1/focus/sessions/${session.id}/segments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${a.accessToken}`,
      },
      body: JSON.stringify(body),
    })
    expect(((await w2.json()) as { inserted: number }).inserted).toBe(0)

    const steal = await app.request(`/api/v1/focus/sessions/${session.id}`, {
      headers: { Authorization: `Bearer ${b.accessToken}` },
    })
    expect(steal.status).toBe(404)
  })
})
