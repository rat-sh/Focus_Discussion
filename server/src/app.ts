import { Hono } from 'hono'
import { serveStatic } from 'hono/serve-static'
import { existsSync } from 'node:fs'
import { stat } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { bodyLimit } from './middleware/bodyLimit'
import { clientIp } from './middleware/clientIp'
import { buildCors } from './middleware/cors'
import { errorHandler } from './middleware/errorHandler'
import { requestLogger } from './middleware/logger'
import { requestId } from './middleware/requestId'
import { securityHeaders } from './middleware/secureHeaders'
import { rateLimit } from './middleware/rateLimit'
import { healthRoutes } from './features/health/routes'
import { authRoutes } from './features/auth/routes'
import { roomRoutes } from './features/rooms/routes'
import { friendRoutes } from './features/friends/routes'
import { focusRoutes } from './features/focus/routes'
import { materialRoutes } from './features/materials/routes'
import { scheduleRoutes } from './features/schedule/routes'
import { profileRoutes } from './features/profiles/routes'
import { youtubeRoutes } from './features/youtube/routes'

export function createApp(): Hono {
  const app = new Hono()

  app.onError(errorHandler)
  app.use('*', requestId)
  app.use('*', clientIp)
  app.use('*', requestLogger)
  app.use('*', buildCors())
  app.use('*', securityHeaders)
  app.use('*', bodyLimit)
  app.use('/api/*', rateLimit('global', (c) => String(c.get('clientIp'))))

  app.route('/', healthRoutes)

  const v1 = new Hono()
  v1.route('/auth', authRoutes)
  v1.route('/rooms', roomRoutes)
  v1.route('/friends', friendRoutes)
  v1.route('/focus', focusRoutes)
  v1.route('/materials', materialRoutes)
  v1.route('/schedule', scheduleRoutes)
  v1.route('/profiles', profileRoutes)
  v1.route('/youtube', youtubeRoutes)
  app.route('/api/v1', v1)

  const distPath = resolve('./dist')
  if (process.env.NODE_ENV === 'production' && existsSync(resolve(distPath, 'index.html'))) {
    app.all('/api/*', (c) => c.json({ error: { code: 'NOT_FOUND', message: 'Not found' } }, 404))
    app.get(
      '*',
      serveStatic({
        root: distPath,
        join,
        getContent: async (path) => {
          const file = Bun.file(path)
          return (await file.exists()) ? file : null
        },
        isDir: async (path) => {
          try {
            return (await stat(path)).isDirectory()
          } catch (error) {
            if (
              error instanceof Error &&
              'code' in error &&
              (error.code === 'ENOENT' || error.code === 'ENOTDIR')
            ) {
              return false
            }
            throw error
          }
        },
        onFound: (path, c) => {
          if (/(?:^|[\\/])assets[\\/]/.test(path)) {
            c.header('Cache-Control', 'public, max-age=31536000, immutable')
          } else if (/(?:^|[\\/])index\.html$/.test(path)) {
            c.header('Cache-Control', 'no-cache')
          }
        },
      }),
    )
    app.get('*', async (c) => {
      const index = Bun.file(resolve(distPath, 'index.html'))
      c.header('Content-Type', 'text/html; charset=utf-8')
      c.header('Cache-Control', 'no-cache')
      return c.body(await index.text())
    })
  }

  app.notFound((c) => c.json({ error: { code: 'NOT_FOUND', message: 'Not found' } }, 404))

  return app
}

export default createApp
