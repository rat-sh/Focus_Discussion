import type { LucideIcon } from 'lucide-react'
import { cx } from '@/shared/lib/cx'

interface CtrlProps { icon: LucideIcon; label: string; /** full spoken name, when the visible label is short */ aria?: string; onClick: () => void; pressed?: boolean; off?: boolean; badge?: number; disabled?: boolean }

/** Zoom-style control: icon over a 12px label, at least 56x52 for thumbs. */
export function Ctrl({ icon: Icon, label, aria, onClick, pressed, off, badge, disabled }: CtrlProps) {
  return (
    <button type="button" onClick={onClick} aria-pressed={pressed} aria-label={aria ?? label} disabled={disabled}
      className={cx('relative flex min-h-[52px] min-w-[60px] flex-col items-center justify-center gap-0.5 rounded-ui px-2 text-xs transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-45',
        off ? 'text-danger' : pressed ? 'bg-accent-soft text-accent' : 'text-fg hover:bg-raised')}>
      <Icon size={20} strokeWidth={1.75} aria-hidden />
      <span className="whitespace-nowrap">{label}</span>
      {badge ? <span className="absolute right-1 top-0.5 rounded-full bg-danger px-1 text-xs leading-4 text-white">{badge}</span> : null}
    </button>
  )
}
