import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { CheckCircle2, CircleAlert } from 'lucide-react'

type Tone = 'success' | 'error'
interface ToastItem { id: number; message: string; tone: Tone }
const Ctx = createContext<{ push: (message: string, tone?: Tone) => void } | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const push = useCallback((message: string, tone: Tone = 'success') => {
    const id = Date.now() + Math.random()
    setItems((p) => [...p.slice(-2), { id, message, tone }])
    setTimeout(() => setItems((p) => p.filter((t) => t.id !== id)), 3500)
  }, [])
  const value = useMemo(() => ({ push }), [push])
  return (
    <Ctx.Provider value={value}>
      {children}
      <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6">
        {items.map((t) => (
          <div key={t.id} className="pointer-events-auto flex max-w-sm items-center gap-2 rounded-ui border border-line bg-raised px-3 py-2 text-sm">
            {t.tone === 'success' ? <CheckCircle2 size={16} className="text-accent" aria-hidden /> : <CircleAlert size={16} className="text-danger" aria-hidden />}
            {t.message}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}

export function useToast() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useToast must be used inside <ToastProvider>')
  return c.push
}
