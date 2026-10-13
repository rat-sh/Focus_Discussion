import type { QualityState } from '@/domain/types'
import type { Signals } from './types'

// Starting thresholds. They are NOT validated on real students yet. Tune with data (see docs/FOCUS_LOCK.md).
export const DWELL_THRESHOLDS_SECONDS = {
  // Dwell durations are measured in seconds.
  noFaceSec: 5,
  eyesClosedSec: 10,
  lookAwaySec: 30,
  phoneSec: 3,
} as const

export const THRESHOLDS = {
  eyesClosed: 0.6, // blink score above this counts as closed
  yawDeg: 35, // looking sideways beyond this
  pitchDownDeg: 20, // head tilted down beyond this (phone posture)
  ...DWELL_THRESHOLDS_SECONDS,
} as const

export interface Dwell { noFace: number; eyesClosed: number; lookAway: number; phone: number }
export const freshDwell = (): Dwell => ({ noFace: 0, eyesClosed: 0, lookAway: 0, phone: 0 })

/**
 * Pure function: one second of signals plus running dwell counters in, state out.
 * `resting` is never inferred. It is declared by the student (button), so a short eye rest is never mistaken for sleep.
 */
export function classify(s: Signals, dwell: Dwell, dtSec = 1): { state: QualityState; dwell: Dwell } {
  const t = THRESHOLDS
  const noFace = s.faceCount === 0
  const closed = !noFace && s.eyesClosed >= t.eyesClosed
  const away = !noFace && Math.abs(s.yawDeg) >= t.yawDeg
  const phone = !noFace && s.phoneVisible && Math.abs(s.pitchDeg) >= t.pitchDownDeg

  const next: Dwell = {
    noFace: noFace ? dwell.noFace + dtSec : 0,
    eyesClosed: closed ? dwell.eyesClosed + dtSec : 0,
    lookAway: away ? dwell.lookAway + dtSec : 0,
    phone: phone ? dwell.phone + dtSec : 0,
  }
  let state: QualityState = noFace ? 'idle' : 'focused'
  if (next.phone >= t.phoneSec) state = 'phone'
  else if (next.noFace >= t.noFaceSec || next.eyesClosed >= t.eyesClosedSec || next.lookAway >= t.lookAwaySec) state = 'lapse'
  return { state, dwell: next }
}
