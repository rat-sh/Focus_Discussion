import type { QualitySegment } from '@/domain/types'
import { STATE_META } from '@/domain/focus'
import { cx } from '@/shared/lib/cx'

/** One horizontal bar, one coloured block per segment. Width is proportional to time. */
export function QualityTimeline({ segments, totalSec, className, height = 'h-3' }: { segments: QualitySegment[]; totalSec?: number; className?: string; height?: string }) {
  const total = totalSec ?? Math.max(segments[segments.length - 1]?.endSec ?? 1, 1)
  return (
    <div className={cx('flex w-full overflow-hidden rounded-full bg-raised', height, className)} role="img"
      aria-label={segments.map((s) => `${STATE_META[s.state].label} ${Math.round((s.endSec - s.startSec) / 60)} minutes`).join(', ')}>
      {segments.map((s, i) => (
        <div key={i} className={STATE_META[s.state].bg} style={{ width: `${((s.endSec - s.startSec) / total) * 100}%` }} />
      ))}
    </div>
  )
}
