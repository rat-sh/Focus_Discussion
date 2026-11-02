import { describe, expect, test } from 'bun:test'
import { loadEnv } from '../src/config/env'

const validProductionEnv = {
  NODE_ENV: 'production',
  DATABASE_URL: 'postgres://db.test:5432/app',
  VALKEY_URL: 'redis://valkey.test:6379',
  CORS_ORIGINS: 'https://focus.test',
  SUPABASE_URL: 'https://project.test',
  SUPABASE_ANON_KEY: 'fake-anon-key',
  COOKIE_SECURE: 'true',
  TRUST_PROXY: 'true',
}

describe('production environment', () => {
  test('accepts configured production values', () => {
    expect(loadEnv(validProductionEnv).NODE_ENV).toBe('production')
  })

  test('rejects missing and development-default values by variable name', () => {
    const invalidValues: [string, string | undefined][] = [
      ['DATABASE_URL', 'YOUR_VALUE_HERE'],
      ['VALKEY_URL', 'redis://127.0.0.1:6379'],
      ['CORS_ORIGINS', 'http://localhost:5173'],
      ['SUPABASE_URL', 'https://YOUR_VALUE_HERE'],
      ['SUPABASE_ANON_KEY', 'YOUR_VALUE_HERE'],
      ['COOKIE_SECURE', 'false'],
      ['TRUST_PROXY', 'false'],
    ]

    for (const [key, value] of invalidValues) {
      expect(() => loadEnv({ ...validProductionEnv, [key]: value })).toThrow(key)
    }
  })
})
