import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import { App } from './app/App'
import { configureSupabase } from './config/env'

// Clean up legacy AI key from localStorage (security: it stored a secret with no consumer).
try { localStorage.removeItem('ai.byok.v1') } catch { /* storage may be blocked */ }

const root = createRoot(document.getElementById('root')!)

async function start(): Promise<void> {
  if (import.meta.env.PROD) {
    const response = await fetch('/api/v1/client-config')
    if (!response.ok) {
      throw new Error(`Client configuration request failed (${response.status})`)
    }
    const config: unknown = await response.json()
    if (
      typeof config !== 'object' ||
      config === null ||
      !('supabaseUrl' in config) ||
      typeof config.supabaseUrl !== 'string' ||
      !('supabaseAnonKey' in config) ||
      typeof config.supabaseAnonKey !== 'string' ||
      !config.supabaseUrl ||
      !config.supabaseAnonKey
    ) {
      throw new Error('The server returned invalid Supabase client configuration')
    }
    configureSupabase(config.supabaseUrl, config.supabaseAnonKey)
  }

  root.render(<StrictMode><App /></StrictMode>)
}

void start().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown startup error'
  root.render(
    <main className="flex min-h-dvh items-center justify-center bg-canvas p-6 text-center">
      <div>
        <h1 className="text-lg font-semibold">App configuration unavailable</h1>
        <p className="mt-2 text-sm text-muted">{message}</p>
      </div>
    </main>,
  )
})
