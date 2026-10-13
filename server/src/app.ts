import { Hono } from 'hono'
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

  app.notFound((c) => c.json({ error: { code: 'NOT_FOUND', message: 'Not found' } }, 404))

  return app
}

export default createApp
