import { createMiddleware } from 'hono/factory'
import { AppError } from '../lib/errors'
import { supabaseUser } from './supabaseAuth'

export interface AuthUser {
  id: string
  email: string
}

export const optionalAuth = createMiddleware(async (c, next) => {
  const header = c.req.header('Authorization')
  if (header?.startsWith('Bearer ')) {
    const token = header.slice(7)
    try {
      const user = await verifyAccessToken(token)
      c.set('user', user)
    } catch (error) {
      if (!(error instanceof AppError) || error.status !== 401) throw error
    }
  }
  await next()
})

export const requireAuth = createMiddleware(async (c, next) => {
  const header = c.req.header('Authorization')
  if (!header?.startsWith('Bearer ')) {
    throw AppError.unauthenticated()
  }
  const user = await verifyAccessToken(header.slice(7))
  c.set('user', user)
  await next()
})

export async function verifyAccessToken(token: string): Promise<AuthUser> {
  const user = await supabaseUser(`Bearer ${token}`)
  return { id: user.id, email: user.email }
}

declare module 'hono' {
  interface ContextVariableMap {
    user?: AuthUser
  }
}
