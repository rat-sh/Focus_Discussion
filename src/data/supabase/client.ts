import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { SUPABASE_ANON_KEY, SUPABASE_URL, USE_MOCK } from '@/config/env'

let client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (USE_MOCK) {
    throw new Error('Supabase client must not be created in mock mode')
  }
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local')
  }
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'sr-sb-auth',
      },
    })
  }
  return client
}
