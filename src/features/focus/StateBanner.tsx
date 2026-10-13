import type { QualityState } from '@/domain/types'
import { STATE_META, formatClock } from '@/domain/focus'
import { Button } from '@/shared/ui/Button'
import { STATE_ICON } from '@/shared/ui/StateChip'
import { cx } from '@/shared/lib/cx'

interface Props { state: QualityState; resting: boolean; restLeftSec: number; cameraBlocked: boolean; onBack: () => void }

/** Warning strip under the top bar. Hidden while the student is focused. */
export function StateBanner({ state, resting, restLeftSec, cameraBlocked, onBack }: Props) {
  if (state === 'focused' && !cameraBlocked) return null
  const s: QualityState = cameraBlocked ? 'idle' : state
  const meta = STATE_META[s]
  const Icon = STATE_ICON[s]
  const over = resting && restLeftSec < 0
  const text = cameraBlocked ? 'Camera is blocked, so this time is not verified. Allow the camera in the address bar.'
    : resting ? over ? `Rest budget used up by ${formatClock(-restLeftSec)}. Extra rest does not count.` : `${formatClock(restLeftSec)} of rest budget left. Time is not counted while you rest.`
    : meta.message
  return (
    <div role="alert" className={cx('flex items-center gap-3 border-b px-4 py-2 text-sm', meta.border, 'bg-surface')}>
      <span className={cx('flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-black', meta.bg)}><Icon size={14} strokeWidth={2.25} aria-hidden /></span>
      <p className="min-w-0 flex-1"><span className={cx('font-semibold', meta.text)}>{meta.label}. </span>{text}</p>
      {resting && <Button size="sm" variant="primary" onClick={onBack}>I’m back</Button>}
    </div>
  )
}
