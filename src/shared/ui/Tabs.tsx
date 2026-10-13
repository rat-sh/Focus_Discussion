import type { LucideIcon } from 'lucide-react'
import { cx } from '../lib/cx'

export interface TabItem<T extends string> { id: T; label: string; icon?: LucideIcon; badge?: number | string }
interface Props<T extends string> {
  items: TabItem<T>[]
  value: T
  onChange: (id: T) => void
  variant?: 'underline' | 'segment'
  dense?: boolean
  className?: string
  label?: string
}

export function Tabs<T extends string>({ items, value, onChange, variant = 'underline', dense, className, label }: Props<T>) {
  return (
    <div role="tablist" aria-label={label}
      className={cx('no-scrollbar flex overflow-x-auto', variant === 'underline' ? 'gap-1 border-b border-line' : 'gap-1 rounded-ui border border-line bg-raised p-1', className)}>
      {items.map(({ id, label: text, icon: Icon, badge }) => {
        const active = id === value
        return (
          <button key={id} role="tab" type="button" aria-selected={active} onClick={() => onChange(id)}
            className={cx('relative inline-flex h-11 md:h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap text-sm transition-colors', dense ? 'px-2' : 'px-3',
              variant === 'segment' && 'flex-1 rounded-[4px] md:h-8',
              active
                ? variant === 'underline' ? 'font-semibold text-fg after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:bg-accent' : 'bg-surface font-semibold text-fg shadow-[inset_0_0_0_1px_var(--line)]'
                : 'text-muted hover:text-fg')}>
            {Icon && <Icon size={15} strokeWidth={1.75} aria-hidden />}
            {text}
            {badge !== undefined && <span className="rounded-full bg-raised px-1.5 text-xs tabular text-muted">{badge}</span>}
          </button>
        )
      })}
    </div>
  )
}
