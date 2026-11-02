import { USE_MOCK } from '@/config/env'
import type { Repos } from './repositories'

let repos: Repos

if (import.meta.env.PROD) {
  repos = (await import('./supabase/repos')).supabaseRepos
} else if (USE_MOCK) {
  repos = (await import('./mock')).mockRepos
} else {
  repos = (await import('./supabase/repos')).supabaseRepos
}

export { repos }
