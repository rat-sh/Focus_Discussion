import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { Button } from './Button'
import { cx } from '../lib/cx'

interface Props { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; size?: 'sm' | 'md' | 'lg'; tall?: boolean; flush?: boolean }

/** Centered modal on desktop, bottom sheet on phones. */
export function Dialog({ open, onClose, title, children, footer, size = 'md', tall, flush }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.activeElement as HTMLElement | null
    ref.current?.querySelector<HTMLElement>('input,textarea,select,button[data-autofocus]')?.focus()
    return () => { document.removeEventListener('keydown', onKey); prev?.focus?.() }
  }, [open, onClose])
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center">
      <button type="button" aria-label="Close dialog" onClick={onClose} className="absolute inset-0 bg-black/60" />
      <div ref={ref} role="dialog" aria-modal="true" aria-label={title}
        className={cx('relative z-10 flex w-full flex-col rounded-t-xl border border-line bg-surface md:rounded-ui', tall ? 'h-[88dvh]' : 'max-h-[88dvh]',
          size === 'sm' ? 'md:max-w-sm' : size === 'lg' ? 'md:max-w-2xl' : 'md:max-w-lg')}>
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-line pl-4 pr-1.5">
          <h2 className="text-sm font-semibold">{title}</h2>
          <Button iconOnly label="Close" icon={X} variant="ghost" onClick={onClose} />
        </header>
        <div className={cx('min-h-0 flex-1', flush ? 'flex flex-col overflow-hidden' : 'overflow-y-auto p-4')}>{children}</div>
        {footer && <footer className="pb-safe flex shrink-0 items-center justify-end gap-2 border-t border-line p-3">{footer}</footer>}
      </div>
    </div>,
    document.body,
  )
}
