import { z } from 'zod'

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(8787),
  DATABASE_URL: z.string().min(1),
  DATABASE_URL_ADMIN: z.string().min(1).optional(),
  VALKEY_URL: z.string().min(1).default('redis://127.0.0.1:6379'),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().min(1).optional(),
  LIVEKIT_URL: z.string().url().optional(),
  LIVEKIT_API_KEY: z.string().min(1).optional(),
  LIVEKIT_API_SECRET: z.string().min(1).optional(),
  YOUTUBE_API_KEY: z.preprocess((value) => value === '' ? undefined : value, z.string().min(1).optional()),
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
  TRUST_PROXY: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  COOKIE_SECURE: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  BODY_LIMIT_BYTES: z.coerce.number().int().positive().default(100_000),
  REFRESH_TOKEN_TTL_SEC: z.coerce.number().int().positive().default(60 * 60 * 24 * 30),
})

export type Env = z.infer<typeof EnvSchema>

let cached: Env | null = null

export function loadEnv(source: Record<string, string | undefined> = process.env): Env {
  const parsed = EnvSchema.safeParse(source)
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
    throw new Error(`Invalid environment: ${msg}`)
  }

  if (parsed.data.NODE_ENV === 'production') {
    const invalid: string[] = []
    const isPlaceholder = (value: string | undefined) =>
      !value?.trim() || /your[_ -]?value|your[_ -]|placeholder|change[_ -]?me|example/i.test(value)
    const isLocalHost = (value: string | undefined) => {
      if (!value) return false
      try {
        const hostname = new URL(value).hostname.toLowerCase()
        return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '[::1]'
      } catch {
        return false
      }
    }

    if (isPlaceholder(source.DATABASE_URL) || isLocalHost(source.DATABASE_URL)) invalid.push('DATABASE_URL')
    if (isPlaceholder(source.VALKEY_URL) || isLocalHost(source.VALKEY_URL)) invalid.push('VALKEY_URL')
    if (
      isPlaceholder(source.CORS_ORIGINS) ||
      source.CORS_ORIGINS?.split(',').some((origin) => /localhost|127\.0\.0\.1|\[::1\]/i.test(origin))
    ) {
      invalid.push('CORS_ORIGINS')
    }
    if (isPlaceholder(source.SUPABASE_URL) || isLocalHost(source.SUPABASE_URL)) invalid.push('SUPABASE_URL')
    if (isPlaceholder(source.SUPABASE_ANON_KEY)) invalid.push('SUPABASE_ANON_KEY')
    if (parsed.data.COOKIE_SECURE !== true) invalid.push('COOKIE_SECURE')
    if (!parsed.data.TRUST_PROXY) invalid.push('TRUST_PROXY')

    if (invalid.length > 0) {
      throw new Error(`Invalid production environment: ${invalid.join(', ')}`)
    }
  }

  cached = parsed.data
  return parsed.data
}

export function env(): Env {
  if (!cached) return loadEnv()
  return cached
}

export function corsOrigins(): string[] {
  return env()
    .CORS_ORIGINS.split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

export function cookieSecure(): boolean {
  const e = env()
  if (e.COOKIE_SECURE !== undefined) return e.COOKIE_SECURE
  return e.NODE_ENV === 'production'
}
