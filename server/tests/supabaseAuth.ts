import { SQL } from 'bun'
import { z } from 'zod'

const SignUpBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  data: z.object({
    name: z.string(),
    handle: z.string(),
  }),
})
const PasswordBody = z.object({
  email: z.string().email(),
  password: z.string(),
})
const RefreshBody = z.object({ refresh_token: z.string().min(1) })

interface TestUser {
  id: string
  email: string
  password: string
  metadata: { name: string; handle: string }
}

interface TestToken {
  userId: string
  familyId: string
  used?: boolean
}

const users = new Map<string, TestUser>()
const accessTokens = new Map<string, TestToken>()
const refreshTokens = new Map<string, TestToken>()
const revokedFamilies = new Set<string>()
let originalFetch: typeof fetch | null = null

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function issueSession(user: TestUser, familyId: string = crypto.randomUUID()): Response {
  const accessToken = `test-access-${crypto.randomUUID()}`
  const refreshToken = `test-refresh-${crypto.randomUUID()}`
  accessTokens.set(accessToken, { userId: user.id, familyId })
  refreshTokens.set(refreshToken, { userId: user.id, familyId })
  return json({
    access_token: accessToken,
    expires_in: 900,
    refresh_token: refreshToken,
    user: { id: user.id, email: user.email, user_metadata: user.metadata },
  })
}

async function persistUser(databaseUrl: string, user: TestUser): Promise<void> {
  const sql = new SQL(databaseUrl)
  try {
    await sql`
      INSERT INTO auth.users (id, email, raw_user_meta_data)
      VALUES (${user.id}::uuid, ${user.email}, jsonb_build_object(
        'name', ${user.metadata.name}::text,
        'handle', ${user.metadata.handle}::text
      ))
    `
  } finally {
    await sql.close()
  }
}

async function handleAuthRequest(request: Request, databaseUrl: string): Promise<Response> {
  const url = new URL(request.url)
  if (request.method === 'GET' && url.pathname === '/auth/v1/user') {
    const token = request.headers.get('Authorization')?.replace(/^Bearer /, '')
    const tokenData = token ? accessTokens.get(token) : undefined
    const user = tokenData ? [...users.values()].find((item) => item.id === tokenData.userId) : undefined
    return user
      ? json({ id: user.id, email: user.email, user_metadata: user.metadata })
      : json({ msg: 'Invalid JWT' }, 401)
  }

  if (request.method !== 'POST') return json({ msg: 'Not found' }, 404)
  if (url.pathname === '/auth/v1/logout') {
    const token = request.headers.get('Authorization')?.replace(/^Bearer /, '')
    const current = token ? accessTokens.get(token) : undefined
    if (!current) return json({ msg: 'Invalid JWT' }, 401)
    revokedFamilies.add(current.familyId)
    return new Response(null, { status: 204 })
  }

  const body: unknown = await request.json()

  if (url.pathname === '/auth/v1/signup') {
    const parsed = SignUpBody.safeParse(body)
    if (!parsed.success) return json({ msg: 'Invalid signup body' }, 400)
    const email = parsed.data.email.toLowerCase()
    if (users.has(email)) return json({ msg: 'User already registered' }, 422)
    const user: TestUser = {
      id: crypto.randomUUID(),
      email,
      password: parsed.data.password,
      metadata: parsed.data.data,
    }
    try {
      await persistUser(databaseUrl, user)
    } catch (error) {
      return json({ msg: 'Could not create auth user', details: String(error) }, 500)
    }
    users.set(email, user)
    return issueSession(user)
  }

  if (url.pathname === '/auth/v1/token' && url.searchParams.get('grant_type') === 'password') {
    const parsed = PasswordBody.safeParse(body)
    if (!parsed.success) return json({ msg: 'Invalid login credentials' }, 400)
    const user = users.get(parsed.data.email.toLowerCase())
    if (user?.password !== parsed.data.password) {
      return json({ msg: 'Invalid login credentials' }, 400)
    }
    return issueSession(user)
  }

  if (url.pathname === '/auth/v1/token' && url.searchParams.get('grant_type') === 'refresh_token') {
    const parsed = RefreshBody.safeParse(body)
    if (!parsed.success) return json({ msg: 'Invalid refresh token' }, 400)
    const current = refreshTokens.get(parsed.data.refresh_token)
    if (current?.used) {
      revokedFamilies.add(current.familyId)
      return json({ msg: 'Invalid refresh token' }, 400)
    }
    if (!current || revokedFamilies.has(current.familyId)) {
      return json({ msg: 'Invalid refresh token' }, 400)
    }
    current.used = true
    const user = [...users.values()].find((item) => item.id === current.userId)
    return user ? issueSession(user, current.familyId) : json({ msg: 'Invalid refresh token' }, 400)
  }

  return json({ msg: 'Not found' }, 404)
}

export function installTestSupabaseAuth(databaseUrl: string): void {
  if (originalFetch) return
  originalFetch = globalThis.fetch
  const fallback = originalFetch
  const testFetch = async (
    input: Parameters<typeof fetch>[0],
    init?: Parameters<typeof fetch>[1],
  ): Promise<Response> => {
    const request = input instanceof Request
      ? new Request(input, init)
      : new Request(String(input), init)
    if (new URL(request.url).origin !== 'http://supabase.test') {
      return fallback(request)
    }
    return handleAuthRequest(request, databaseUrl)
  }
  Object.defineProperty(globalThis, 'fetch', {
    configurable: true,
    writable: true,
    value: testFetch,
  })
}

export function resetTestSupabaseAuth(): void {
  users.clear()
  accessTokens.clear()
  refreshTokens.clear()
  revokedFamilies.clear()
}

export function restoreTestSupabaseAuth(): void {
  if (!originalFetch) return
  globalThis.fetch = originalFetch
  originalFetch = null
  resetTestSupabaseAuth()
}
