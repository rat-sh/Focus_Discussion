import type { DayQuality, QualityState } from '@/domain/types'
import { STATE_META, formatMinutes } from '@/domain/focus'
import { cx } from '@/shared/lib/cx'

const ROWS: { key: keyof Omit<DayQuality, 'day'>; state: QualityState }[] = [
  { key: 'focusedMin', state: 'focused' }, { key: 'restMin', state: 'resting' }, { key: 'phoneMin', state: 'phone' }, { key: 'lapseMin', state: 'lapse' },
]

/** Stacked bars per day. Pure CSS, no chart library. */
export function QualityBars({ days, height = 140, className }: { days: DayQuality[]; height?: number; className?: string }) {
  const max = Math.max(...days.map((d) => d.focusedMin + d.restMin + d.phoneMin + d.lapseMin), 1)
  return (
    <div className={cx('flex items-end gap-2', className)} style={{ height }} role="img"
      aria-label={`Weekly study time. ${days.map((d) => `${d.day} ${formatMinutes(d.focusedMin)} focused`).join(', ')}`}>
      {days.map((d) => {
        const total = d.focusedMin + d.restMin + d.phoneMin + d.lapseMin
        return (
          <div key={d.day} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
            <div className="flex w-full flex-col-reverse overflow-hidden rounded-[4px] bg-raised" style={{ height: `${(total / max) * 100}%`, minHeight: 4 }} title={`${d.day}: ${formatMinutes(d.focusedMin)} focused`}>
              {ROWS.map((r) => <div key={r.key} className={STATE_META[r.state].bg} style={{ height: `${(d[r.key] / total) * 100}%` }} />)}
            </div>
            <span className="text-xs text-muted">{d.day}</span>
          </div>
        )
      })}
    </div>
  )
}
