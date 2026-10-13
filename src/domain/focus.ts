import type { FocusSessionRecord, QualitySegment, QualityState } from './types'

export interface StateMeta {
  label: string
  short: string
  message: string
  /** tailwind class bundles */
  text: string
  bg: string
  border: string
  counts: boolean
}

// One definition of what each colour means. UI, stats and SQL views all follow this table.
export const STATE_META: Record<QualityState, StateMeta> = {
  focused: { label: 'Focused', short: 'Focus', message: 'Counting toward your estimated focus time.', text: 'text-st-focus', bg: 'bg-st-focus', border: 'border-st-focus', counts: true },
  studying: { label: 'Studying externally', short: 'External', message: 'You opened a study link in another tab. This time counts but is not camera-verified.', text: 'text-st-focus', bg: 'bg-st-focus/70', border: 'border-st-focus/70', counts: true },
  phone: { label: 'Possible phone use', short: 'Phone?', message: 'A phone may be in view while your head is tilted. This estimate cannot tell whether you are studying or taking a break.', text: 'text-st-phone', bg: 'bg-st-phone', border: 'border-st-phone', counts: false },
  resting: { label: 'On a break', short: 'Break', message: 'You declared a break. Break time is tracked separately.', text: 'text-st-rest', bg: 'bg-st-rest', border: 'border-st-rest', counts: false },
  lapse: { label: 'Attention not confirmed', short: 'Check', message: 'We could not confirm attention for a while. Look at the screen, or tap Take a rest if you are on a break.', text: 'text-st-lapse', bg: 'bg-st-lapse', border: 'border-st-lapse', counts: false },
  idle: { label: 'Not confirmed', short: 'Unknown', message: 'A face has not been confirmed yet, the camera is paused, or the page is hidden. This time is not counted as focus.', text: 'text-st-idle', bg: 'bg-st-idle', border: 'border-st-idle', counts: false },
}
export const STATE_ORDER: QualityState[] = ['focused', 'studying', 'resting', 'phone', 'lapse', 'idle']

export interface QualitySummary {
  elapsedSec: number
  bySec: Record<QualityState, number>
  qualitySec: number
  restAllowedSec: number
  restExcessSec: number
  /** 0..100. focused / (elapsed minus rest within budget) */
  score: number
}

const zero = (): Record<QualityState, number> => ({ focused: 0, studying: 0, phone: 0, resting: 0, lapse: 0, idle: 0 })

/** Pure function. Same input always gives the same summary (safe to mirror in SQL). */
export function summarize(segments: QualitySegment[], plannedSec: number, restBudgetPct: number): QualitySummary {
  const bySec = zero()
  let elapsedSec = 0
  for (const s of segments) {
    const d = Math.max(0, s.endSec - s.startSec)
    bySec[s.state] += d
    elapsedSec += d
  }
  const restBudgetSec = Math.round((plannedSec * restBudgetPct) / 100)
  const restAllowedSec = Math.min(bySec.resting, restBudgetSec)
  const restExcessSec = bySec.resting - restAllowedSec
  const qualitySec = bySec.focused + bySec.studying
  const denom = elapsedSec - restAllowedSec
  const score = denom > 0 ? Math.round((qualitySec / denom) * 100) : 0
  return { elapsedSec, bySec, qualitySec, restAllowedSec, restExcessSec, score }
}

export const summarizeRecord = (r: FocusSessionRecord) => summarize(r.segments, r.plannedMin * 60, r.restBudgetPct)

/** Merge a new sample into the segment list (run-length encoding). Keeps storage small. */
export function pushSample(segments: QualitySegment[], state: QualityState, nowSec: number, gapSec = 1): QualitySegment[] {
  const last = segments[segments.length - 1]
  if (last && last.state === state && last.endSec >= nowSec - gapSec) {
    return [...segments.slice(0, -1), { ...last, endSec: nowSec }]
  }
  const start = last ? last.endSec : 0
  return [...segments, { state, startSec: start, endSec: nowSec }]
}

export function formatClock(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(sec).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

export function formatMinutes(min: number): string {
  const m = Math.round(min)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  const r = m % 60
  return r ? `${h}h ${r}m` : `${h}h`
}
