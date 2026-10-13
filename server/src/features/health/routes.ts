import { Hono } from 'hono'
import { pingSql } from '../../db/sql'
import { pingValkey } from '../../cache/valkey'

export const healthRoutes = new Hono()

healthRoutes.get('/healthz', (c) => c.json({ ok: true }))

healthRoutes.get('/readyz', async (c) => {
  const [pg, vk] = await Promise.all([pingSql(), pingValkey()])
  const ready = pg && vk
  return c.json({ ok: ready, postgres: pg, valkey: vk }, ready ? 200 : 503)
})
