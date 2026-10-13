import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Navigate, useNavigate } from 'react-router-dom'
import { Coffee, Info, Maximize2, Minimize2, Music2, PictureInPicture2, Square } from 'lucide-react'
import { ENABLE_DEMO } from '@/config/env'
import { repos } from '@/data'
import { STATE_META, STATE_ORDER, formatClock, formatMinutes } from '@/domain/focus'
import type { FocusLink, QualityState } from '@/domain/types'
import { useProfile } from '@/shared/context/profile'
import { Button } from '@/shared/ui/Button'
import { Dialog } from '@/shared/ui/Dialog'
import { StateChip } from '@/shared/ui/StateChip'
import { Tabs } from '@/shared/ui/Tabs'
import { cx } from '@/shared/lib/cx'
import { MusicPanel } from '../music/MusicPanel'
import { CameraTile } from './CameraTile'
import { LinkViewer } from './LinkViewer'
import { StateBanner } from './StateBanner'
import { clearPlan, loadPlan } from './planStore'
import { QualityTimeline } from './QualityTimeline'
import { useCamera } from './useCamera'
import { useFocusSession } from './useFocusSession'
import { usePip } from './usePip'

const KIND_LABEL = { material: 'Study', practice: 'Practice', ai: 'AI help' } as const

export function FocusSessionPage() {
  const plan = useMemo(() => loadPlan(), [])
  if (!plan) return <Navigate to="/focus" replace />
  return <Runner plan={plan} />
}

function Runner({ plan }: { plan: NonNullable<ReturnType<typeof loadPlan>> }) {
  const navigate = useNavigate()
  const { profile } = useProfile()
  const liveMode = repos.kind === 'live'
  const cameraTracking = plan.tracking === 'camera'
  // Demo controls exist only in dev builds, or when a build opts in with VITE_ENABLE_DEMO=true. Never in production.
  const demo = useMemo(() => ENABLE_DEMO && new URLSearchParams(location.search).has('demo'), [])
  const [speed, setSpeed] = useState(1)
  const [activeId, setActiveId] = useState<string>(plan.links[0]?.id ?? '')
  const [confirmEnd, setConfirmEnd] = useState(false)
  const [music, setMusic] = useState(false)
  const startedAt = useRef(new Date().toISOString())
  const pip = usePip()
  const [isFullscreen, setIsFullscreen] = useState(false)

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      void document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => undefined)
    } else {
      void document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => undefined)
    }
  }

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  const cam = useCamera(cameraTracking)
  const camOk = cam.status === 'granted' || (demo && cameraTracking)
  const effective = useMemo(() => ({ ...plan, tracking: cameraTracking && camOk ? ('camera' as const) : ('none' as const) }), [plan, cameraTracking, camOk])

  const s = useFocusSession({
    plan: effective, stream: cam.stream, speed,
    mock: !liveMode,
    onFinish: async (segments, elapsedSec, tracked) => {
      const rec = await repos.focus.save({ title: plan.title, startedAt: startedAt.current, plannedMin: plan.durationMin, elapsedSec, restBudgetPct: plan.restBudgetPct, tracked, segments })
      clearPlan()
      navigate(`/recap/${rec.id}`, { replace: true })
    },
  })

  // Keep the screen awake and warn before a refresh would restart the clock.
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null
    const acquire = async () => { try { lock = await (navigator as unknown as { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }).wakeLock?.request('screen') ?? null } catch { /* not supported */ } }
    void acquire()
    const onVis = () => { if (!document.hidden) void acquire() }
    const onUnload = (e: BeforeUnloadEvent) => { e.preventDefault() }
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('beforeunload', onUnload)
    return () => { document.removeEventListener('visibilitychange', onVis); window.removeEventListener('beforeunload', onUnload); void lock?.release() }
  }, [])

  const active: FocusLink | undefined = plan.links.find((l) => l.id === activeId) ?? plan.links[0]
  const cameraBlocked = cameraTracking && !camOk && cam.status !== 'requesting'
  const name = profile?.name ?? 'You'
  const tile = <CameraTile stream={cam.stream} status={demo && cam.status !== 'granted' ? 'granted' : cam.status} mode={plan.camera} state={s.state} name={name} avatarUrl={profile?.avatarUrl} />

  return (
    <div className="flex h-dvh flex-col bg-canvas">
      <header className="pt-safe flex min-h-14 shrink-0 items-center gap-3 border-b border-line bg-surface px-4">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{plan.title}</p>
          <p className="hidden items-center gap-1.5 text-xs text-muted sm:flex">
            Focus Lock · {formatMinutes(plan.durationMin)}
            {effective.tracking === 'camera' && s.trackingStatus === 'ready' && (
              <span className="group relative inline-flex cursor-help items-center gap-0.5 rounded border border-line px-1 py-px text-[10px] text-muted">
                <Info size={10} strokeWidth={2} aria-hidden />On-device
                <span className="pointer-events-none absolute left-0 top-full z-30 mt-1 hidden w-64 rounded-ui border border-line bg-surface p-2 text-xs leading-snug text-fg shadow-lg group-hover:block">
                  Camera analysis runs on this device. It estimates presence, sustained eye closure, and possible phone use; it does not measure understanding.
                </span>
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-4 font-mono tabular" aria-live="off">
          <div className="text-center"><p className="text-xs font-sans text-muted">Left</p><p className="text-lg font-semibold leading-none">{formatClock(s.remainingSec)}</p></div>
          <div className="text-center"><p className="text-xs font-sans text-muted">Quality</p><p className="text-lg font-semibold leading-none text-st-focus">{formatClock(s.summary.qualitySec)}</p></div>
          <div className="hidden text-center sm:block"><p className="text-xs font-sans text-muted">Score</p><p className="text-lg font-semibold leading-none">{s.trackingStatus !== 'ready' || s.summary.elapsedSec < 60 ? '—' : `${s.summary.score}%`}</p></div>
        </div>
        <StateChip state={s.state} compact className="hidden md:inline-flex" />
        <Button iconOnly label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'} icon={isFullscreen ? Minimize2 : Maximize2} size="sm" onClick={toggleFullscreen} />
        <Button variant="danger" size="sm" icon={Square} onClick={() => setConfirmEnd(true)}>End</Button>
      </header>

      <StateBanner state={s.state} resting={s.resting} restLeftSec={s.restLeftSec} cameraBlocked={cameraBlocked} onBack={s.endRest} />
      {effective.tracking === 'camera' && s.trackingStatus === 'loading' && <p role="status" className="border-b border-line bg-raised px-4 py-2 text-sm text-muted">Starting on-device face and phone checks. Time before tracking is ready is marked not monitored.</p>}
      {/* Camera-ready disclaimer moved inline next to Focus Lock in the header */}
      {s.trackingStatus === 'error' && <p role="alert" className="border-b border-line bg-raised px-4 py-2 text-sm text-danger">Focus tracking stopped: {s.trackingError ?? 'on-device detection failed'}. This time is not monitored or counted.</p>}

      <div className="relative flex min-h-0 flex-1 flex-col">
        <Tabs label="Your links" value={active?.id ?? ''} onChange={setActiveId} className="shrink-0 bg-surface px-2"
          items={plan.links.map((l, i) => ({ id: l.id, label: `${KIND_LABEL[l.kind]}${plan.links.filter((x) => x.kind === l.kind).length > 1 ? ` ${plan.links.slice(0, i + 1).filter((x) => x.kind === l.kind).length}` : ''}` }))} />
        <div className="min-h-0 flex-1 bg-canvas">{active && <LinkViewer link={active} />}</div>
        {tile && <div className="absolute right-3 top-14 z-20 md:top-16 [&>div]:shadow-lg">{tile}</div>}
      </div>

      {demo && (
        <div className="flex flex-wrap items-center gap-2 border-t border-line bg-raised px-3 py-2 text-xs">
          <span className="text-muted">Demo</span>
          {STATE_ORDER.filter((x) => x !== 'resting').map((st) => <Button key={st} size="sm" onClick={() => s.force(st as QualityState)}>{STATE_META[st].short}</Button>)}
          <Button size="sm" onClick={() => s.force(null)}>Auto</Button>
          {[1, 30, 120].map((x) => <Button key={x} size="sm" variant={speed === x ? 'primary' : 'secondary'} onClick={() => setSpeed(x)}>{x}×</Button>)}
        </div>
      )}

      <footer className="pb-safe flex shrink-0 items-center justify-center gap-2 border-t border-line bg-surface px-3 pt-2">
        <Button icon={Coffee} className={cx(s.resting && 'border-st-rest text-st-rest')} onClick={s.resting ? s.endRest : s.startRest}>{s.resting ? 'End rest' : 'Take a rest'}</Button>
        <Button icon={Music2} onClick={() => setMusic(true)}>Music</Button>
        {!liveMode && pip.supported && <Button icon={PictureInPicture2} onClick={() => (pip.isOpen ? pip.close() : void pip.open())}>{pip.isOpen ? 'Close pop-out' : 'Pop out camera'}</Button>}
      </footer>
      {pip.win && createPortal(
        <div className="flex flex-col items-center gap-2 bg-canvas p-2 text-fg">{tile}<p className="font-mono text-lg tabular">{formatClock(s.remainingSec)}</p><StateChip state={s.state} compact /></div>,
        pip.win.document.body)}

      <Dialog open={music} onClose={() => setMusic(false)} title="Study music"><div className="-m-4"><MusicPanel /></div></Dialog>
      <Dialog open={confirmEnd} onClose={() => setConfirmEnd(false)} title="End this session?" size="sm"
        footer={<><Button variant="ghost" onClick={() => setConfirmEnd(false)}>Keep studying</Button><Button variant="danger" onClick={() => { setConfirmEnd(false); s.finish() }}>End and save</Button></>}>
        <p className="mb-3 text-sm text-muted">{formatMinutes(s.summary.qualitySec / 60)} of quality time so far, {s.summary.score}% focus score.</p>
        <QualityTimeline segments={s.segments.length ? s.segments : [{ state: 'idle', startSec: 0, endSec: 1 }]} />
      </Dialog>
    </div>
  )
}
