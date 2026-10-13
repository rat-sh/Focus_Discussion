import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import { App } from './app/App'

// Clean up legacy AI key from localStorage (security: it stored a secret with no consumer).
try { localStorage.removeItem('ai.byok.v1') } catch { /* storage may be blocked */ }

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
