import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { CornerDownLeft, Search } from 'lucide-react'
import { Dialog } from '../ui/Dialog'
import { Kbd } from '../ui/Feedback'
import { cx } from '../lib/cx'

export interface Command {
  id: string
  label: string
  hint?: string
  /** typed as "/name argument" in the palette or in room chat */
  slash?: string
  run: (arg: string) => void
}
interface Value { open: () => void; register: (scope: string, cmds: Command[]) => () => void; commands: Command[]; runSlash: (text: string) => boolean }
const Ctx = createContext<Value | null>(null)

export function CommandProvider({ children }: { children: ReactNode }) {
  const [scopes, setScopes] = useState<Record<string, Command[]>>({})
  const [isOpen, setOpen] = useState(false)
  const navigate = useNavigate()

  const base: Command[] = useMemo(() => [
    { id: 'go-home', label: 'Go to Home', slash: 'home', run: () => navigate('/') },
    { id: 'go-rooms', label: 'Go to My rooms', slash: 'rooms', run: () => navigate('/rooms') },
    { id: 'go-focus', label: 'Start Focus Lock', slash: 'focus', run: () => navigate('/focus') },
    { id: 'go-friends', label: 'Go to Friends', slash: 'friends', run: () => navigate('/friends') },
    { id: 'go-materials', label: 'Go to Study materials', slash: 'materials', run: () => navigate('/materials') },
    { id: 'go-settings', label: 'Open Settings', slash: 'settings', run: () => navigate('/settings') },
  ], [navigate])

  const commands = useMemo(() => [...base, ...Object.values(scopes).flat()], [base, scopes])
  const register = useCallback((scope: string, cmds: Command[]) => {
    setScopes((p) => ({ ...p, [scope]: cmds }))
    return () => setScopes((p) => { const n = { ...p }; delete n[scope]; return n })
  }, [])
  const value = useMemo<Value>(() => ({
    open: () => setOpen(true),
    commands,
    register,
    runSlash: (text) => {
      const m = /^\/(\S+)\s*(.*)$/.exec(text.trim())
      const cmd = m && commands.find((c) => c.slash === m[1].toLowerCase())
      if (!cmd || !m) return false
      cmd.run(m[2].trim())
      return true
    },
  }), [commands, register])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen((o) => !o) } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <Ctx.Provider value={value}>
      {children}
      {isOpen && <Palette onClose={() => setOpen(false)} commands={commands} />}
    </Ctx.Provider>
  )
}

function Palette({ onClose, commands }: { onClose: () => void; commands: Command[] }) {
  const [q, setQ] = useState('')
  const [idx, setIdx] = useState(0)
  const slash = /^\/(\S*)\s*(.*)$/.exec(q)
  const list = useMemo(() => {
    if (slash) return commands.filter((c) => c.slash?.startsWith(slash[1].toLowerCase()))
    const n = q.trim().toLowerCase()
    return n ? commands.filter((c) => c.label.toLowerCase().includes(n)) : commands
  }, [q, commands, slash])
  const run = (c?: Command) => { if (!c) return; onClose(); c.run(slash?.[2]?.trim() ?? '') }

  return (
    <Dialog open onClose={onClose} title="Command palette" size="md">
      <div className="-m-4 flex flex-col">
        <div className="flex items-center gap-2 border-b border-line px-3">
          <Search size={16} className="text-muted" aria-hidden />
          <input data-autofocus value={q} onChange={(e) => { setQ(e.target.value); setIdx(0) }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => Math.min(i + 1, list.length - 1)) }
              if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)) }
              if (e.key === 'Enter') run(list[idx])
            }}
            placeholder="Type a command or /music lofi" aria-label="Command"
            className="h-12 flex-1 bg-transparent text-base outline-none placeholder:text-muted md:text-sm" />
          <Kbd>Esc</Kbd>
        </div>
        <ul className="max-h-72 overflow-y-auto p-1.5" role="listbox">
          {list.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted">No matching command</li>}
          {list.map((c, i) => (
            <li key={c.id} role="option" aria-selected={i === idx}>
              <button type="button" onMouseEnter={() => setIdx(i)} onClick={() => run(c)}
                className={cx('flex min-h-11 w-full items-center justify-between gap-3 rounded-ui px-3 text-left text-sm md:min-h-9', i === idx && 'bg-raised')}>
                <span>{c.label}{c.hint && <span className="ml-2 text-xs text-muted">{c.hint}</span>}</span>
                {c.slash && <span className="font-mono text-xs text-muted">/{c.slash}</span>}
                {i === idx && !c.slash && <CornerDownLeft size={14} className="text-muted" aria-hidden />}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Dialog>
  )
}

export function useCommands() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useCommands outside CommandProvider')
  return c
}

/** Register page-specific commands while a screen is mounted. */
export function useRegisterCommands(scope: string, commands: Command[]) {
  const { register } = useCommands()
  useEffect(() => register(scope, commands), [register, scope, commands])
}
