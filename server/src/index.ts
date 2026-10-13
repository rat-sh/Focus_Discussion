import { loadEnv, env } from './config/env'
import { createApp } from './app'
import { closeSql } from './db/sql'
import { closeValkey } from './cache/valkey'
import { logger } from './lib/logger'

loadEnv()
const app = createApp()
const port = env().PORT

const server = Bun.serve({
  port,
  fetch: app.fetch,
})

logger.info('api listening', { port })

let shuttingDown = false

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return
  shuttingDown = true
  logger.info('shutdown start', { signal })
  await server.stop(true)
  closeValkey()
  await closeSql()
  logger.info('shutdown complete')
  process.exit(0)
}

process.on('SIGTERM', () => {
  void shutdown('SIGTERM')
})
process.on('SIGINT', () => {
  void shutdown('SIGINT')
})
