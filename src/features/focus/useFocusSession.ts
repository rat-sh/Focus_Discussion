import { useCallback, useEffect, useRef, useState } from 'react'
import type { FocusPlan, QualitySegment, QualityState } from '@/domain/types'
import { pushSample, summarize } from '@/domain/focus'
import { createAttentionEngine, type AttentionEngine } from './engine'

export const REST_CHUNK_SEC = 5 * 60

interface Options {
  plan: FocusPlan
  stream: MediaStream | null
  mock: boolean
  speed?: number
  onFinish: (segments: QualitySegment[], elapsedSec: number, tracked: boolean) => void
}

/** Owns the clock, the state machine and the colour timeline of one focus session. */
export function useFocusSession({ plan, stream, mock, speed = 1, onFinish }: Options) {
  const plannedSec = plan.durationMin * 60
  const [segments, setSegments] = useState<QualitySegment[]>([])
  const [elapsedSec, setElapsedSec] = useState(0)
  const [state, setState] = useState<QualityState>('focused')
  const [restingUntil, setRestingUntil] = useState<number | null>(null)
  const [finished, setFinished] = useState(false)
  const [trackingState, setTrackingState] = useState<{
    status: 'off' | 'ready' | 'error'
    stream: MediaStream | null
    error: string | null
  }>({ status: 'off', stream: null, error: null })

  const engine = useRef<AttentionEngine | null>(null)
  const latest = useRef<QualityState>('focused')
  const tracked = useRef(false)
  const clock = useRef(0)
  const rest = useRef<number | null>(null)
  const segs = useRef<QualitySegment[]>([])
  const done = useRef(false)
  const finishRef = useRef(onFinish)
  const tracking = plan.tracking === 'camera'

  useEffect(() => { finishRef.current = onFinish }, [onFinish])

  // Detector lifecycle
  useEffect(() => {
    if (!tracking) {
      latest.current = 'idle'
      tracked.current = false
      return
    }
    latest.current = 'idle'
    tracked.current = false
    let cancelled = false
    let activeEngine: AttentionEngine | null = null
    let offSample = () => {}
    let offError = () => {}
    const reportError = (cause: unknown) => {
      if (cancelled) return
      latest.current = 'idle'
      tracked.current = false
      setTrackingState({
        status: 'error',
        stream,
        error: cause instanceof Error ? cause.message : 'Could not start on-device focus tracking.',
      })
    }
    const start = async () => {
      try {
        const nextEngine = await createAttentionEngine(mock)
        if (cancelled) {
          nextEngine.stop()
          return
        }
        activeEngine = nextEngine
        engine.current = nextEngine
        offSample = nextEngine.onSample((sample) => { latest.current = sample.state })
        offError = nextEngine.onError((error) => {
          latest.current = 'idle'
          tracked.current = false
          setTrackingState({ status: 'error', stream, error: error.message })
        })
        await nextEngine.start(stream)
        if (cancelled || engine.current !== nextEngine) return
        tracked.current = true
        setTrackingState({ status: 'ready', stream, error: null })
      } catch (cause) {
        if (activeEngine && engine.current !== activeEngine) return
        reportError(cause)
      }
    }
    void start()
    return () => {
      cancelled = true
      offSample()
      offError()
      activeEngine?.stop()
      if (engine.current === activeEngine) engine.current = null
    }
  }, [tracking, stream, mock])

  const finish = useCallback(() => {
    if (done.current) return
    done.current = true
    setFinished(true)
    finishRef.current(segs.current, clock.current, tracked.current)
  }, [])

  // One tick per second. `speed` only exists to preview a whole session in the demo.
  useEffect(() => {
    const id = setInterval(() => {
      if (done.current) return
      clock.current += speed
      const now = clock.current
      if (rest.current !== null && now >= rest.current) { rest.current = null; setRestingUntil(null) }
      const next: QualityState = document.hidden ? 'idle' : rest.current !== null ? 'resting' : !tracking ? 'idle' : latest.current
      segs.current = pushSample(segs.current, next, now, speed)
      setSegments(segs.current)
      setElapsedSec(now)
      setState(next)
      if (now >= plannedSec) finish()
    }, 1000)
    return () => clearInterval(id)
  }, [speed, tracking, plannedSec, finish])

  const startRest = useCallback(() => {
    const until = clock.current + REST_CHUNK_SEC
    rest.current = until
    setRestingUntil(until)
  }, [])
  const endRest = useCallback(() => {
    rest.current = null
    setRestingUntil(null)
  }, [])
  const force = useCallback((s: QualityState | null) => { engine.current?.force?.(s) }, [])

  const summary = summarize(segments, plannedSec, plan.restBudgetPct)
  const restBudgetSec = Math.round((plannedSec * plan.restBudgetPct) / 100)
  const currentTracking = trackingState.stream === stream ? trackingState : null
  const currentTrackingStatus = !tracking ? 'off' : currentTracking?.status === 'ready' || currentTracking?.status === 'error'
    ? currentTracking.status
    : 'loading'
  return {
    state, segments, elapsedSec, plannedSec, remainingSec: Math.max(0, plannedSec - elapsedSec), summary, finished,
    resting: restingUntil !== null, restLeftSec: restBudgetSec - summary.bySec.resting, restBudgetSec,
    startRest, endRest, finish, force, trackingStatus: currentTrackingStatus,
    trackingError: currentTrackingStatus === 'error' ? currentTracking?.error : null,
  }
}
