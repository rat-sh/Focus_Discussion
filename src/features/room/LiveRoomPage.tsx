import { lazy, Suspense, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Ellipsis, Hand, LayoutGrid, Lock, MessageSquare, Mic, MicOff, RefreshCw, UserPlus, Video, VideoOff } from 'lucide-react'
import { useProfile } from '@/shared/context/profile'
import { useCommands, useRegisterCommands, type Command } from '@/shared/context/command'
import { Button } from '@/shared/ui/Button'
import { Dialog } from '@/shared/ui/Dialog'
import { Skeleton } from '@/shared/ui/Feedback'
import { Tabs, type TabItem } from '@/shared/ui/Tabs'
import { useIsDesktop } from '@/shared/hooks/useMediaQuery'
import { Ctrl } from './ControlBar'
import { InviteDialog } from './InviteDialog'
import { LiveChatPanel } from './LiveChatPanel'
import { LiveAudioTracks } from './LiveAudioTracks'
import { MaterialStage } from './OtherStages'
import { GalleryView, Filmstrip, SpeakerView } from './VideoViews'
import { PeoplePanel } from './panels'
import { useLiveRoomConnection } from './useLiveRoomConnection'

const LiveMusicPlayer = lazy(() => import('./LiveMusicPlayer').then((module) => ({ default: module.LiveMusicPlayer })))
const LiveWhiteboard = lazy(() => import('./LiveWhiteboard').then((module) => ({ default: module.LiveWhiteboard })))

type Layout = 'stage' | 'speaker' | 'gallery'
type StageTab = 'board' | 'material'
type SideTab = 'chat' | 'doubts' | 'people' | 'music' | 'ranks'
const LAYOUTS: TabItem<Layout>[] = [{ id: 'stage', label: 'Content' }, { id: 'speaker', label: 'Speaker' }, { id: 'gallery', label: 'Gallery' }]
const STAGE_TABS: TabItem<StageTab>[] = [{ id: 'board', label: 'Board' }, { id: 'material', label: 'Material' }]
const SIDE_TABS: TabItem<SideTab>[] = [
  { id: 'chat', label: 'Chat' }, { id: 'doubts', label: 'Doubts' }, { id: 'people', label: 'People' },
  { id: 'music', label: 'Music' }, { id: 'ranks', label: 'Ranks' },
]

export function LiveRoomPage() {
  const { code = '' } = useParams()
  const nav = useNavigate()
  const joined = (useLocation().state ?? {}) as { mic?: boolean; cam?: boolean }
  const { profile } = useProfile()
  const { runSlash } = useCommands()
  const desktop = useIsDesktop()
  const connection = useLiveRoomConnection({
    code,
    initialMic: joined.mic,
    initialCam: joined.cam,
    userId: profile?.id,
    runSlash,
  })
  const [layout, setLayout] = useState<Layout>('stage')
  const [stageTab, setStageTab] = useState<StageTab>('board')
  const [sideTab, setSideTab] = useState<SideTab>('chat')
  const [sheet, setSheet] = useState<SideTab | 'more' | null>(null)
  const [invite, setInvite] = useState(false)
  const commands = useMemo<Command[]>(() => [
    { id: 'live-room-board', label: 'Show board', slash: 'board', run: () => { setLayout('stage'); setStageTab('board') } },
    { id: 'live-room-material', label: 'Show material', slash: 'material', run: () => { setLayout('stage'); setStageTab('material') } },
    { id: 'live-room-gallery', label: 'Gallery view', slash: 'gallery', run: () => setLayout('gallery') },
    { id: 'live-room-speaker', label: 'Speaker view', slash: 'speaker', run: () => setLayout('speaker') },
    { id: 'live-room-hand', label: 'Raise or lower hand', slash: 'hand', run: connection.toggleHand },
    { id: 'live-room-invite', label: 'Invite people', slash: 'invite', run: () => setInvite(true) },
    { id: 'live-room-doubts', label: 'Open doubts', slash: 'doubts', run: () => { setSideTab('doubts'); setSheet('doubts') } },
    { id: 'live-room-people', label: 'Open people', slash: 'people', run: () => { setSideTab('people'); setSheet('people') } },
  ], [connection.toggleHand])
  useRegisterCommands('live-room', commands)

  const openPanel = (tab: SideTab) => {
    if (desktop) setSideTab(tab)
    else setSheet(tab)
  }

  const roomContent = layout === 'gallery'
    ? <GalleryView people={connection.visibleParticipants} meId={profile?.id ?? ''} />
    : layout === 'speaker'
      ? <SpeakerView people={connection.visibleParticipants} meId={profile?.id ?? ''} />
      : (
        <div className="flex h-full min-h-0 flex-col">
          <Tabs label="Shared content" value={stageTab} onChange={setStageTab} items={STAGE_TABS} className="shrink-0 bg-surface px-2" />
          <div className="min-h-0 flex-1 bg-canvas">
            {stageTab === 'board' && connection.roomId
              ? <Suspense fallback={<div className="grid h-full place-items-center text-sm text-muted">Loading shared board...</div>}>
                  <LiveWhiteboard roomId={connection.roomId} liveRoom={connection.liveRoom} connected={connection.connected} userId={profile?.id ?? ''} />
                </Suspense>
              : stageTab === 'material'
                ? <MaterialStage roomId={connection.roomId ?? undefined} />
                : <div className="grid h-full place-items-center p-4 text-sm text-muted">Connecting to the shared board…</div>}
          </div>
        </div>
      )

  const panelContent = (tab: SideTab) => {
    if (tab === 'chat') return connection.roomId
      ? <LiveChatPanel messages={connection.messages} currentUserId={profile?.id ?? ''} connected={connection.connected} error={connection.chatError} onSend={connection.postChat} />
      : <p className="p-4 text-sm text-muted">Connecting to room chat…</p>
    if (tab === 'people') return <PeoplePanel people={connection.visibleParticipants} meId={profile?.id ?? ''} />
    if (tab === 'music') return connection.roomId
      ? <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3"><Suspense fallback={<p className="text-sm text-muted">Loading shared music...</p>}><LiveMusicPlayer roomId={connection.roomId} liveRoom={connection.liveRoom} connected={connection.connected} /></Suspense></div>
      : <p className="p-4 text-sm text-muted">Connecting to shared music…</p>
    if (tab === 'doubts') return <p role="status" className="p-4 text-sm text-muted">Room doubts are not yet connected to real room storage. No mock questions are shown here.</p>
    return <p role="status" className="p-4 text-sm text-muted">Quality ranks require real focus tracking. Focus Lock is currently timer-only in live mode, so no mock scores are shown.</p>
  }

  return (
    <main className="flex h-dvh flex-col bg-canvas">
      <header className="pt-safe flex min-h-12 shrink-0 items-center gap-2 border-b border-line bg-surface px-3">
        <div className="min-w-0 flex-1"><h1 className="truncate text-sm font-semibold">{connection.roomName}</h1><p className="font-mono text-xs text-muted">{connection.connecting ? 'Connecting…' : `${code} · ${connection.visibleParticipants.length} in room`}</p></div>
        {desktop && <Tabs variant="segment" label="Layout" value={layout} onChange={setLayout} items={LAYOUTS} className="w-64" />}
        {desktop && <Button icon={UserPlus} variant="primary" onClick={() => setInvite(true)}>Invite</Button>}
        {!desktop && <Button iconOnly label="Change layout" icon={LayoutGrid} onClick={() => setLayout((current) => current === 'stage' ? 'gallery' : current === 'gallery' ? 'speaker' : 'stage')} />}
        <Button variant="danger" onClick={() => { connection.roomRef.current?.disconnect(); nav('/rooms') }}>Leave</Button>
      </header>
      {connection.error && (
        <div role="alert" className="flex flex-wrap items-center gap-3 border-b border-danger/30 bg-danger/10 px-4 py-2 text-sm text-danger">
          <p className="min-w-0 flex-1">{connection.error}</p>
          {connection.connectionFailed && <Button size="sm" variant="secondary" icon={RefreshCw} onClick={() => connection.setConnectionAttempt((attempt) => attempt + 1)}>Retry connection</Button>}
        </div>
      )}
      {connection.audioBlocked && <button type="button" className="border-b border-line bg-raised px-4 py-2 text-sm text-accent" onClick={() => { void connection.roomRef.current?.startAudio().then(() => connection.setAudioBlocked(false)).catch((cause: unknown) => connection.setError(cause instanceof Error ? cause.message : 'Could not enable audio')) }}>Click to enable room audio</button>}

      <LiveAudioTracks participants={connection.visibleParticipants} userId={profile?.id ?? ''} />
      <div className="flex min-h-0 flex-1">
        <section className="flex min-w-0 flex-1 flex-col" aria-label="Main room view">
          <div className="min-h-0 flex-1">
            {connection.connecting && layout !== 'stage'
              ? <div className="grid h-full grid-cols-1 gap-3 p-3 sm:grid-cols-2"><Skeleton className="h-56" /><Skeleton className="h-56" /></div>
              : roomContent}
          </div>
          {!desktop && layout === 'stage' && <div className="shrink-0 border-t border-line bg-surface p-2"><Filmstrip people={connection.visibleParticipants} meId={profile?.id ?? ''} cols="row" onMore={() => setLayout('gallery')} /></div>}
        </section>
        {desktop && (
          <aside className="flex w-80 shrink-0 flex-col border-l border-line bg-surface" aria-label="Room panel">
            {layout === 'stage' && <div className="shrink-0 border-b border-line p-2"><Filmstrip people={connection.visibleParticipants} meId={profile?.id ?? ''} cols="grid" onMore={() => setLayout('gallery')} /></div>}
            <Tabs label="Room panel" value={sideTab} onChange={setSideTab} items={SIDE_TABS} dense className="shrink-0 px-1" />
            <div className="flex min-h-0 flex-1 flex-col">{panelContent(sideTab)}</div>
          </aside>
        )}
      </div>
      <footer className="pb-safe flex shrink-0 items-center justify-center gap-1 border-t border-line bg-surface px-2 pt-1.5">
        <Ctrl icon={connection.mic ? Mic : MicOff} label={connection.mic ? 'Mute' : 'Unmute'} off={!connection.mic} disabled={!connection.connected} onClick={() => void connection.toggleMic()} />
        <Ctrl icon={connection.cam ? Video : VideoOff} label={connection.cam ? 'Stop video' : 'Video'} aria={connection.cam ? 'Stop video' : 'Start video'} off={!connection.cam} disabled={!connection.connected} onClick={() => void connection.toggleCam()} />
        <Ctrl icon={Hand} label="Hand" aria={connection.hand ? 'Lower hand' : 'Raise hand'} pressed={connection.hand} disabled={!connection.connected} onClick={connection.toggleHand} />
        {!desktop && <Ctrl icon={MessageSquare} label="Chat" onClick={() => openPanel('chat')} />}
        {!desktop && <Ctrl icon={Ellipsis} label="More" onClick={() => setSheet('more')} />}
        {desktop && <Ctrl icon={Lock} label="Focus" onClick={() => nav('/focus')} />}
      </footer>

      <InviteDialog open={invite} onClose={() => setInvite(false)} code={code} name={connection.roomName} />
      <Dialog open={!desktop && sheet !== null && sheet !== 'more'} onClose={() => setSheet(null)} title="Room" tall flush>
        {sheet && sheet !== 'more' && (
          <div className="flex min-h-0 flex-1 flex-col">
            <Tabs label="Room panel" value={sheet} onChange={(tab) => setSheet(tab)} items={SIDE_TABS} dense className="shrink-0 px-1" />
            <div className="flex min-h-0 flex-1 flex-col">{panelContent(sheet)}</div>
          </div>
        )}
      </Dialog>
      <Dialog open={!desktop && sheet === 'more'} onClose={() => setSheet(null)} title="More">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5"><span className="text-xs font-medium text-muted">Layout</span><Tabs variant="segment" label="Layout" value={layout} onChange={(value) => { setLayout(value); setSheet(null) }} items={LAYOUTS} /></div>
          <ul className="flex flex-col">
            {(['doubts', 'people', 'music', 'ranks'] as SideTab[]).map((tab) => (
              <li key={tab}><button type="button" onClick={() => { setSideTab(tab); setSheet(tab) }} className="flex h-12 w-full items-center border-b border-line text-sm capitalize">{tab}</button></li>
            ))}
            <li><button type="button" onClick={() => { setSheet(null); setInvite(true) }} className="flex h-12 w-full items-center border-b border-line text-sm">Invite people</button></li>
            <li><button type="button" onClick={() => nav('/focus')} className="flex h-12 w-full items-center text-sm">Start Focus Lock</button></li>
          </ul>
        </div>
      </Dialog>
    </main>
  )
}
