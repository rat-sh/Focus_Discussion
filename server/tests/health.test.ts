import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { createApp } from '../src/app'
import { closeSql } from '../src/db/sql'
import { closeValkey } from '../src/cache/valkey'
import { ensureTestDb, truncateAll } from './setup'

describe('health', () => {
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

  test('GET /healthz', async () => {
    const app = createApp()
    const res = await app.request('/healthz')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { ok: boolean }
    expect(body.ok).toBe(true)
    expect(res.headers.get('X-Request-Id')).toBeTruthy()
  })

  test('GET /readyz', async () => {
    const app = createApp()
    const res = await app.request('/readyz')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { ok: boolean; postgres: boolean; valkey: boolean }
    expect(body.ok).toBe(true)
    expect(body.postgres).toBe(true)
    expect(body.valkey).toBe(true)
  })
})
