import type { AuthTokensDto, ProfileDto } from '@studyroom/contract'
import { z } from 'zod'
import { cookieSecure, env } from '../../config/env'
import { AppError } from '../../lib/errors'
import * as repo from './repo'

const REFRESH_COOKIE = 'sr_refresh'
const REFRESH_PATH = '/api/v1/auth'

const AuthSession = z.object({
  access_token: z.string().min(1),
  expires_in: z.number().int().positive(),
  refresh_token: z.string().min(1),
  user: z.object({
    id: z.string().uuid(),
    email: z.string().email().nullable().optional(),
  }).passthrough(),
})

const SignupWithoutSession = z.union([
  z.object({ id: z.string().uuid() }).passthrough(),
  z.object({ user: z.object({ id: z.string().uuid() }).passthrough() }).passthrough(),
])

function toProfileDto(row: repo.ProfileRow): ProfileDto {
  return {
    id: row.user_id,
    email: row.email,
    name: row.name,
    handle: row.handle,
    avatarUrl: row.avatar_url,
    streakDays: row.streak_days,
  }
}

export function refreshCookieName(): string {
  return REFRESH_COOKIE
}

export function refreshCookieOptions(maxAgeSec: number): {
  path: string
  httpOnly: boolean
  secure: boolean
  sameSite: 'Strict'
  maxAge: number
} {
  return {
    path: REFRESH_PATH,
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: 'Strict',
    maxAge: maxAgeSec,
  }
}

export function clearRefreshCookieOptions(): {
  path: string
  httpOnly: boolean
  secure: boolean
  sameSite: 'Strict'
  maxAge: number
} {
  return { ...refreshCookieOptions(0), maxAge: 0 }
}

async function authRequest(
  path: string,
  body?: unknown,
  accessToken?: string,
): Promise<unknown> {
  const config = env()
  if (!config.SUPABASE_URL || !config.SUPABASE_ANON_KEY) {
    throw new AppError('INTERNAL', 'Supabase authentication is not configured', 503)
  }

  const headers = new Headers({
    apikey: config.SUPABASE_ANON_KEY,
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...(body ? { 'Content-Type': 'application/json' } : {}),
  })

  let response: Response
  try {
    response = await fetch(
      `${config.SUPABASE_URL.replace(/\/+$/, '')}/auth/v1/${path}`,
      {
        method: 'POST',
        headers,
        ...(body ? { body: JSON.stringify(body) } : {}),
      },
    )
  } catch (error) {
    throw new AppError('INTERNAL', 'Could not reach Supabase Auth', 503, { cause: error })
  }

  if (response.status === 204) return null

  const responseText = await response.text()
  let data: unknown = null
  if (responseText) {
    try {
      data = JSON.parse(responseText) as unknown
    } catch (error) {
      if (response.ok) {
        throw new AppError('INTERNAL', 'Supabase Auth returned an invalid response', 502, { cause: error })
      }
    }
  }

  if (!response.ok) {
    const errorBody = z.object({
      msg: z.string().optional(),
      message: z.string().optional(),
      error_description: z.string().optional(),
    }).safeParse(data)
    const message = errorBody.success
      ? errorBody.data.msg ?? errorBody.data.message ?? errorBody.data.error_description
      : undefined

    if (response.status === 429) {
      const retryAfter = Number(response.headers.get('Retry-After'))
      throw AppError.rateLimited(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : 1)
    }
    if (path.startsWith('token?') || response.status === 401) {
      throw AppError.unauthenticated('Invalid credentials')
    }
    if (path === 'signup' && message?.toLowerCase().includes('already registered')) {
      throw AppError.conflict('Email already registered')
    }
    if (path === 'signup' && message?.toLowerCase().includes('handle')) {
      throw AppError.conflict('Handle already taken')
    }
    if (response.status === 400 || response.status === 422) {
      throw AppError.validation(message ?? 'Supabase Auth rejected the request')
    }
    throw new AppError('INTERNAL', 'Supabase Auth request failed', 502)
  }

  return data
}

async function tokensFor(data: unknown): Promise<{ dto: AuthTokensDto; refreshRaw: string }> {
  const parsed = AuthSession.safeParse(data)
  if (!parsed.success) {
    throw new AppError('INTERNAL', 'Supabase Auth returned an invalid session', 502)
  }
  const email = parsed.data.user.email ?? ''
  const profile = await repo.getProfile(parsed.data.user.id, email)
  if (!profile) throw AppError.internal('Supabase Auth created a user without a profile')

  return {
    dto: {
      accessToken: parsed.data.access_token,
      expiresIn: parsed.data.expires_in,
      user: toProfileDto(profile),
    },
    refreshRaw: parsed.data.refresh_token,
  }
}

export async function register(input: {
  email: string
  password: string
  name: string
  handle: string
}): Promise<{ dto: AuthTokensDto; refreshRaw: string }> {
  const data = await authRequest('signup', {
    email: input.email,
    password: input.password,
    data: { name: input.name, handle: input.handle.toLowerCase() },
  })
  const session = AuthSession.safeParse(data)
  if (!session.success && SignupWithoutSession.safeParse(data).success) {
    throw AppError.unauthenticated('Check your email to confirm the account, then sign in.')
  }
  return tokensFor(data)
}

export async function login(input: {
  email: string
  password: string
}): Promise<{ dto: AuthTokensDto; refreshRaw: string }> {
  return tokensFor(await authRequest('token?grant_type=password', input))
}

export async function refresh(rawToken: string): Promise<{ dto: AuthTokensDto; refreshRaw: string }> {
  return tokensFor(await authRequest('token?grant_type=refresh_token', { refresh_token: rawToken }))
}

async function logoutWithAccessToken(accessToken: string): Promise<void> {
  await authRequest('logout', undefined, accessToken)
}

export async function logout(
  rawRefreshToken: string | undefined,
  accessToken: string | undefined,
): Promise<void> {
  if (accessToken) {
    try {
      await logoutWithAccessToken(accessToken)
      return
    } catch (error) {
      if (!(error instanceof AppError) || error.status !== 401 || !rawRefreshToken) throw error
    }
  }

  if (!rawRefreshToken) return
  const data = await authRequest('token?grant_type=refresh_token', {
    refresh_token: rawRefreshToken,
  })
  const session = AuthSession.safeParse(data)
  if (!session.success) {
    throw new AppError('INTERNAL', 'Supabase Auth returned an invalid refresh session', 502)
  }
  await logoutWithAccessToken(session.data.access_token)
}

export async function me(userId: string, email: string): Promise<ProfileDto> {
  const profile = await repo.getProfile(userId, email)
  if (!profile) throw AppError.notFound('Profile not found')
  return toProfileDto(profile)
}

export async function patchMe(
  userId: string,
  email: string,
  patch: { name?: string; handle?: string },
): Promise<ProfileDto> {
  try {
    const updated = await repo.updateProfile(userId, email, {
      name: patch.name,
      handle: patch.handle?.toLowerCase(),
    })
    if (!updated) throw AppError.notFound('Profile not found')
    return toProfileDto(updated)
  } catch (error) {
    if (error instanceof AppError) throw error
    if (String(error).includes('handle')) throw AppError.conflict('Handle already taken')
    throw error
  }
}

export function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) return {}
  const out: Record<string, string> = {}
  for (const part of header.split(';')) {
    const idx = part.indexOf('=')
    if (idx <= 0) continue
    const key = part.slice(0, idx).trim()
    const value = part.slice(idx + 1).trim()
    try {
      out[key] = decodeURIComponent(value)
    } catch {
      throw AppError.validation('Malformed cookie header')
    }
  }
  return out
}
