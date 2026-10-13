import { RedisClient } from 'bun'
import { env } from '../config/env'
import { logger } from '../lib/logger'

let client: RedisClient | null = null

export function getValkey(): RedisClient {
  client ??= new RedisClient(env().VALKEY_URL)
  return client
}

export function closeValkey(): void {
  if (client) {
    client.close()
    client = null
  }
}

export async function pingValkey(): Promise<boolean> {
  try {
    const r = getValkey()
    await r.ping()
    return true
  } catch (err) {
    logger.warn('valkey ping failed', { err: String(err) })
    return false
  }
}

export async function valkeyAvailable(): Promise<boolean> {
  return pingValkey()
}
