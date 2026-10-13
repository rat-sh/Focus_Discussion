import { USE_MOCK } from '@/config/env'
import type { Repos } from './repositories'

// Static conditional dynamic import: mock data is omitted from the production
// bundle when VITE_USE_MOCK=false. Never silently fall back to mock.
export const repos: Repos = USE_MOCK
  ? (await import('./mock')).mockRepos
  : (await import('./supabase/repos')).supabaseRepos
