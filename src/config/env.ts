/**
 * Typed environment variables.
 *
 * Every env var the app reads is defined here so there is one place to look.
 * Vite injects `import.meta.env.*` at build time; this module re-exports them
 * with correct types and sensible defaults.
 */

/** True when Vite is running in development mode. */
export const IS_DEV = import.meta.env.DEV

/**
 * When true (default), UI uses in-memory mock repositories.
 * When false, UI talks to Supabase. Never falls back to mock data.
 * Read ONLY here — nowhere else should inspect VITE_USE_MOCK.
 */
export const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'

/** Demo shortcuts exist only in mock mode. Live mode never shows them. */
export const ENABLE_DEMO = USE_MOCK && (IS_DEV || import.meta.env.VITE_ENABLE_DEMO === 'true')

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? ''
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''
