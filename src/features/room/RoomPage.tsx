import { lazy, useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Ellipsis, Hand, LayoutGrid, Lock, Mic, MicOff, MessageSquare, Pause, Play, UserPlus, Video, VideoOff } from 'lucide-react'
import { repos } from '@/data'
import { useResource } from '@/data/hooks'
import type { Participant } from '@/domain/types'
import { formatClock } from '@/domain/focus'
import { useRegisterCommands, type Command } from '@/shared/context/command'
import { useProfile } from '@/shared/context/profile'
import { Button } from '@/shared/ui/Button'
import { Dialog } from '@/shared/ui/Dialog'
import { Skeleton } from '@/shared/ui/Feedback'
import { Tabs, type TabItem } from '@/shared/ui/Tabs'
import { useIsDesktop } from '@/shared/hooks/useMediaQuery'
import { cx } from '@/shared/lib/cx'
import { BoardStage } from './BoardStage'
import { Ctrl } from './ControlBar'
import { InviteDialog } from './InviteDialog'
import { MaterialStage } from './OtherStages'
import { ChatPanel, DoubtsPanel, MusicTab, PeoplePanel, RanksPanel } from './panels'
import { Filmstrip, GalleryView, SpeakerView } from './VideoViews'
import { useRoomTimer } from './useRoomTimer'

const LiveRoomPage = lazy(() => import('./LiveRoomPage').then((module) => ({ default: module.LiveRoomPage })))

type Layout = 'stage' | 'speaker' | 'gallery'
type StageTab = 'board' | 'material'
type SideTab = 'chat' | 'doubts' | 'people' | 'music' | 'ranks'

const LAYOUTS: TabItem<Layout>[] = [{ id: 'stage', label: 'Content' }, { id: 'speaker', label: 'Speaker' }, { id: 'gallery', label: 'Gallery' }]
const STAGE_TABS: TabItem<StageTab>[] = [{ id: 'board', label: 'Board' }, { id: 'material', label: 'Material' }]

export function RoomPage() {
  return repos.kind === 'live' ? <LiveRoomPage /> : <MockRoomPage />
}

function MockRoomPage() {
  const { code = '' } = useParams()
  const nav = useNavigate()
  const joined = (useLocation().state ?? {}) as { name?: string; mic?: boolean; cam?: boolean }
  const { profile } = useProfile()
  const desktop = useIsDesktop()
  const meId = profile?.id ?? 'u_me'
  const displayName = joined.name ?? profile?.name ?? 'You'

  const preview = useResource(() => repos.rooms.preview(code), code)
  const initial = useResource(() => repos.live.participants(code), code)
  const [live, setLive] = useState<Participant[] | null>(null)
  useEffect(() => repos.live.subscribe(code, setLive), [code])

  const [mic, setMic] = useState(joined.mic ?? true)
  const [cam, setCam] = useState(joined.cam ?? false)
  const [hand, setHand] = useState(false)
  const [layout, setLayout] = useState<Layout>('stage')
  const [stageTab, setStageTab] = useState<StageTab>('board')
  const [sideTab, setSideTab] = useState<SideTab>('chat')
  const [panelOpen, setPanelOpen] = useState(true)
  const [sheet, setSheet] = useState<SideTab | 'more' | null>(null)
  const [invite, setInvite] = useState(false)
  const timer = useRoomTimer()

  const people = useMemo(() => {
    const base = live ?? initial.data ?? []
    const others = Math.max(0, ...base.filter((p) => p.id !== meId).map((p) => p.handOrder ?? 0))
    return base.map((p) => (p.id === meId ? { ...p, name: displayName, mic, cam, handOrder: hand ? others + 1 : null } : p))
  }, [live, initial.data, meId, displayName, mic, cam, hand])

  const me = people.find((p) => p.id === meId)
  const isHost = me?.role === 'host'
  const roomName = preview.data?.name || code
  const raised = people.filter((p) => p.handOrder !== null).length

  const leave = () => nav('/rooms')
  const openPanel = useCallback((t: SideTab) => { if (desktop) setSideTab(t); else setSheet(t) }, [desktop])
  const roomCommands = useMemo<Command[]>(() => [
    { id: 'r-board', label: 'Show board', slash: 'board', run: () => { setLayout('stage'); setStageTab('board') } },
    { id: 'r-material', label: 'Show material', slash: 'material', run: () => { setLayout('stage'); setStageTab('material') } },
    { id: 'r-gallery', label: 'Gallery view', slash: 'gallery', run: () => setLayout('gallery') },
    { id: 'r-speaker', label: 'Speaker view', slash: 'speaker', run: () => setLayout('speaker') },
    { id: 'r-hand', label: 'Raise or lower hand', slash: 'hand', run: () => setHand((h) => !h) },
    { id: 'r-invite', label: 'Invite people', slash: 'invite', run: () => setInvite(true) },
    { id: 'r-doubts', label: 'Open doubts', slash: 'doubts', run: () => openPanel('doubts') },
    { id: 'r-people', label: 'Open people', slash: 'people', run: () => openPanel('people') },
  ], [openPanel])
  useRegisterCommands('room', roomCommands)

  if (preview.data && preview.data.availability !== 'open') return <Navigate to={`/j/${code}`} replace />
  if (!initial.data && !live) return <div className="flex h-dvh flex-col gap-3 bg-canvas p-4"><Skeleton className="h-12" /><Skeleton className="flex-1" /><Skeleton className="h-16" /></div>

  const stage = (
    <div className="flex h-full min-h-0 flex-col">
      <Tabs label="Shared content" value={stageTab} onChange={setStageTab} items={STAGE_TABS} className="shrink-0 bg-surface px-2" />
      <div className="min-h-0 flex-1 bg-canvas">
        {stageTab === 'board' && <BoardStage />}
        {stageTab === 'material' && <MaterialStage />}
      </div>
    </div>
  )
  const main = layout === 'gallery' ? <GalleryView people={people} meId={meId} /> : layout === 'speaker' ? <SpeakerView people={people} meId={meId} /> : stage

  const SIDE: TabItem<SideTab>[] = [
    { id: 'chat', label: 'Chat' }, { id: 'doubts', label: 'Doubts' }, { id: 'people', label: 'People' },
    { id: 'music', label: 'Music' }, { id: 'ranks', label: 'Ranks' },
  ]
  const panel = (t: SideTab) => t === 'chat' ? <ChatPanel code={code} /> : t === 'doubts' ? <DoubtsPanel code={code} /> : t === 'people' ? <PeoplePanel people={people} meId={meId} />
    : t === 'music' ? <MusicTab /> : <RanksPanel code={code} />

  const timerPill = (
    <button type="button" onClick={timer.toggle} aria-label={timer.running ? 'Pause shared timer' : 'Resume shared timer'} className="flex h-10 items-center gap-2 rounded-ui border border-line px-3 font-mono text-sm tabular md:h-8">
      {timer.running ? <Pause size={12} aria-hidden /> : <Play size={12} aria-hidden />}{formatClock(timer.left)}
    </button>
  )

  return (
    <div className="flex h-dvh flex-col bg-canvas">
      <header className="pt-safe flex min-h-12 shrink-0 items-center gap-2 border-b border-line bg-surface px-3">
        <div className="min-w-0 flex-1"><h1 className="truncate text-sm font-semibold">{roomName}</h1><p className="font-mono text-xs text-muted">{code}</p></div>
        {desktop && <Tabs variant="segment" label="Layout" value={layout} onChange={setLayout} items={LAYOUTS} className="w-64" />}
        {desktop && <Button icon={panelOpen ? ChevronRight : ChevronLeft} aria-label={panelOpen ? 'Hide room panel' : 'Show room panel'} aria-pressed={panelOpen} onClick={() => setPanelOpen((open) => !open)}>{panelOpen ? 'Hide panel' : 'Show panel'}</Button>}
        {timerPill}
        {desktop && <Button icon={UserPlus} variant="primary" onClick={() => setInvite(true)}>Invite</Button>}
        {!desktop && <Button iconOnly label="Change layout" icon={LayoutGrid} onClick={() => setLayout((l) => (l === 'stage' ? 'gallery' : l === 'gallery' ? 'speaker' : 'stage'))} />}
        <Button variant="danger" onClick={leave}>Leave</Button>
      </header>

      <div className="flex min-h-0 flex-1">
        <section className="flex min-w-0 flex-1 flex-col" aria-label="Main view">
          <div className="min-h-0 flex-1">{main}</div>
          {!desktop && layout === 'stage' && <div className="shrink-0 border-t border-line bg-surface p-2"><Filmstrip people={people} meId={meId} cols="row" onMore={() => setLayout('gallery')} /></div>}
        </section>
        {desktop && panelOpen && (
          <aside className="flex w-80 shrink-0 flex-col border-l border-line bg-surface" aria-label="Room panel">
            {layout === 'stage' && <div className="shrink-0 border-b border-line p-2"><Filmstrip people={people} meId={meId} cols="grid" onMore={() => setLayout('gallery')} /></div>}
            <Tabs label="Room panel" value={sideTab} onChange={setSideTab} items={SIDE} dense className="shrink-0 px-1" />
            <div className="flex min-h-0 flex-1 flex-col">{panel(sideTab)}</div>
          </aside>
        )}
      </div>

      <footer className="pb-safe flex shrink-0 items-center justify-center gap-1 border-t border-line bg-surface px-2 pt-1.5">
        <Ctrl icon={mic ? Mic : MicOff} label={mic ? 'Mute' : 'Unmute'} off={!mic} onClick={() => setMic((v) => !v)} />
        <Ctrl icon={cam ? Video : VideoOff} label="Video" aria={cam ? 'Stop video' : 'Start video'} off={!cam} onClick={() => setCam((v) => !v)} />
        <Ctrl icon={Hand} label="Hand" aria={hand ? 'Lower hand' : 'Raise hand'} pressed={hand} badge={isHost ? raised : undefined} onClick={() => setHand((h) => !h)} />
        {!desktop && <Ctrl icon={MessageSquare} label="Chat" onClick={() => setSheet('chat')} />}
        {!desktop && <Ctrl icon={Ellipsis} label="More" onClick={() => setSheet('more')} />}
        {desktop && <Ctrl icon={Lock} label="Focus" onClick={() => nav('/focus')} />}
      </footer>

      <InviteDialog open={invite} onClose={() => setInvite(false)} code={code} name={roomName} />

      {/* Phone: panels open as a bottom sheet */}
      <Dialog open={!desktop && sheet !== null && sheet !== 'more'} onClose={() => setSheet(null)} title="Room" tall flush>
        {sheet && sheet !== 'more' && (
          <div className="flex min-h-0 flex-1 flex-col">
            <Tabs label="Room panel" value={sheet} onChange={setSheet} items={SIDE} dense className="shrink-0 px-1" />
            <div className="flex min-h-0 flex-1 flex-col">{panel(sheet)}</div>
          </div>
        )}
      </Dialog>
      <Dialog open={!desktop && sheet === 'more'} onClose={() => setSheet(null)} title="More">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5"><span className="text-xs font-medium text-muted">Layout</span><Tabs variant="segment" label="Layout" value={layout} onChange={(l) => { setLayout(l); setSheet(null) }} items={LAYOUTS} /></div>
          <ul className="flex flex-col">
            {([['doubts', 'Doubts'], ['people', 'People'], ['music', 'Music'], ['ranks', 'Ranks']] as [SideTab, string][]).map(([id, label]) => (
              <li key={id}><button type="button" onClick={() => setSheet(id)} className={cx('flex h-12 w-full items-center border-b border-line text-sm')}>{label}</button></li>
            ))}
            <li><button type="button" onClick={() => { setSheet(null); setInvite(true) }} className="flex h-12 w-full items-center border-b border-line text-sm">Invite people</button></li>
            <li><button type="button" onClick={() => nav('/focus')} className="flex h-12 w-full items-center text-sm">Start Focus Lock</button></li>
          </ul>
        </div>
      </Dialog>
    </div>
  )
}
