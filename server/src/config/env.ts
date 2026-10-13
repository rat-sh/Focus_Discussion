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
