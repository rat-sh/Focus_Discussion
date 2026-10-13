import { BookOpen, CirclePause, Coffee, Eye, EyeOff, Smartphone, type LucideIcon } from 'lucide-react'
import type { QualityState } from '@/domain/types'
import { STATE_META } from '@/domain/focus'
import { cx } from '../lib/cx'

export const STATE_ICON: Record<QualityState, LucideIcon> = {
  focused: Eye, studying: BookOpen, phone: Smartphone, resting: Coffee, lapse: EyeOff, idle: CirclePause,
}

/** Colour is never the only signal: every state also has an icon and a text label. */
export function StateChip({ state, compact, className }: { state: QualityState; compact?: boolean; className?: string }) {
  const m = STATE_META[state]
  const Icon = STATE_ICON[state]
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium', m.border, m.text, className)}>
      <Icon size={12} strokeWidth={2} aria-hidden />
      {compact ? m.short : m.label}
    </span>
  )
}

export function StateDot({ state, className }: { state: QualityState; className?: string }) {
  return <span role="img" aria-label={STATE_META[state].label} className={cx('inline-block h-2.5 w-2.5 rounded-full', STATE_META[state].bg, className)} />
}

export function StateLegend({ className }: { className?: string }) {
  const order: QualityState[] = ['focused', 'studying', 'resting', 'phone', 'lapse', 'idle']
  return <div className={cx('flex flex-wrap gap-x-4 gap-y-1.5', className)}>{order.map((s) => <StateChip key={s} state={s} compact className="border-transparent px-0" />)}</div>
}
