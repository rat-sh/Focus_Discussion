import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ChevronRight, ClipboardList, Copy, FileText, FolderOpen, Image as ImageIcon, KeyRound, Link2, MessageCircleQuestion, Plus, Trash2, type LucideIcon } from 'lucide-react'
import { repos } from '@/data'
import { useResource, type Resource } from '@/data/hooks'
import type { ArtifactKind, Room } from '@/domain/types'
import { Button, ButtonLink } from '@/shared/ui/Button'
import { Dialog } from '@/shared/ui/Dialog'
import { Async, Badge, EmptyState } from '@/shared/ui/Feedback'
import { Panel, PanelHeader, PageHeader } from '@/shared/ui/Panel'
import { Tabs } from '@/shared/ui/Tabs'
import { useToast } from '@/shared/ui/Toast'
import { useIsDesktop } from '@/shared/hooks/useMediaQuery'
import { cx } from '@/shared/lib/cx'
import { formatDate, formatDay, formatTime, timeAgo } from '@/shared/lib/format'
import { roomInviteUrl } from '@/shared/lib/roomLinks'
import { CreateRoomDialog } from './CreateRoomDialog'

const ARTIFACT_ICON: Record<ArtifactKind, LucideIcon> = { board: ImageIcon, recap: ClipboardList, doubts: MessageCircleQuestion, material: Link2, transcript: FileText }

export function RoomsPage() {
  const { roomId, sessionId } = useParams()
  const desktop = useIsDesktop()
  const rooms = useResource(() => repos.rooms.listMine())
  const [creating, setCreating] = useState(false)
  const [tab, setTab] = useState<'owner' | 'member'>('owner')

  useEffect(() => {
    const onRoomsChanged = () => { void rooms.reload() }
    const onFocus = () => { void rooms.reload() }
    window.addEventListener('studyroom:rooms-changed', onRoomsChanged)
    window.addEventListener('focus', onFocus)
    return () => {
      window.removeEventListener('studyroom:rooms-changed', onRoomsChanged)
      window.removeEventListener('focus', onFocus)
    }
  }, [rooms])

  return (
    <>
      <PageHeader title="My rooms" subtitle="Rooms you created or joined. Every session is saved in its own folder."
        actions={<div className="flex flex-wrap gap-2"><ButtonLink to="/join" icon={KeyRound}>Join with code</ButtonLink><Button variant="primary" icon={Plus} onClick={() => setCreating(true)}>Start a room</Button></div>} />
      <Async res={rooms}>
        {(all) => {
          const selected = all.find((r) => r.id === roomId)
          const list = (
            <Panel className="overflow-hidden">
              <div className="p-2"><Tabs variant="segment" label="Room ownership" value={tab} onChange={setTab}
                items={[{ id: 'owner', label: 'Created', badge: all.filter((r) => r.membership === 'owner').length }, { id: 'member', label: 'Joined', badge: all.filter((r) => r.membership === 'member').length }]} /></div>
              <ul>
                {all.filter((r) => r.membership === tab).length === 0 && (
                  <li><EmptyState icon={FolderOpen} title={tab === 'owner' ? 'No rooms created' : 'No rooms joined'} text={tab === 'owner' ? 'Start a room and share the invite code.' : 'Join with a code from a friend.'} /></li>
                )}
                {all.filter((r) => r.membership === tab).map((r) => (
                  <li key={r.id}>
                    <Link to={`/rooms/${r.id}`} aria-current={r.id === roomId ? 'page' : undefined}
                      className={cx('flex min-h-14 items-center gap-3 border-t border-line px-3 py-2 hover:bg-raised', r.id === roomId && 'bg-accent-soft')}>
                      <FolderOpen size={18} className={r.id === roomId ? 'text-accent' : 'text-muted'} aria-hidden />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{r.name}</p>
                        <p className="truncate text-xs text-muted">{r.sessionCount} sessions · {r.lastSessionAt ? timeAgo(r.lastSessionAt) : 'no sessions yet'}</p>
                      </div>
                      <ChevronRight size={14} className="text-muted" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          )
          if (desktop) {
            return (
              <div className="grid grid-cols-[320px_minmax(0,1fr)] items-start gap-4">
                {list}
                {selected ? <RoomDetail key={selected.id} room={selected} sessionId={sessionId} desktop rooms={rooms} /> : <Panel><EmptyState icon={FolderOpen} title="Select a room" text="Open a room to see its sessions, boards and materials." /></Panel>}
              </div>
            )
          }
          return selected ? <RoomDetail room={selected} sessionId={sessionId} rooms={rooms} /> : list
        }}
      </Async>
      <CreateRoomDialog open={creating} onClose={() => setCreating(false)} />
    </>
  )
}

function RoomDetail({ room, sessionId, desktop, rooms }: { room: Room; sessionId?: string; desktop?: boolean; rooms: Resource<Room[]> }) {
  const sessions = useResource(() => repos.rooms.listSessions(room.id), room.id)
  const toast = useToast()
  const navigate = useNavigate()
  const [deleting, setDeleting] = useState(false)
  const copy = async () => {
    try { await navigator.clipboard.writeText(roomInviteUrl(room.code)); toast('Invite link copied') } catch { toast('Copy is blocked by the browser', 'error') }
  }
  const remove = async () => {
    try {
      rooms.setData((prev) => prev?.filter((item) => item.id !== room.id) ?? prev)
      await repos.rooms.remove(room.id)
      window.dispatchEvent(new CustomEvent('studyroom:rooms-changed'))
      toast('Room deleted')
      navigate('/rooms', { replace: true })
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not delete room', 'error')
      void rooms.reload()
    } finally {
      setDeleting(false)
    }
  }

  // Phone: a session opens as its own screen.
  if (!desktop && sessionId) return <SessionFolder room={room} sessionId={sessionId} sessions={sessions.data} />

  return (
    <div className="flex flex-col gap-4">
      {!desktop && <Link to="/rooms" className="inline-flex h-11 items-center gap-1.5 self-start text-sm text-muted"><ArrowLeft size={14} aria-hidden />My rooms</Link>}
      <Panel className="flex flex-col gap-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold">{room.name}</h2>
            <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted">
              <span className="font-mono">{room.code}</span><Badge>{room.topic}</Badge><Badge>{room.mode === 'teach' ? 'Teach' : 'Study together'}</Badge>
              <span>{room.memberCount} members · host {room.ownerName}</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button icon={Copy} onClick={() => void copy()}>Copy invite</Button>
            {room.membership === 'owner' && (
              <Button variant="danger" icon={Trash2} onClick={() => setDeleting(true)}>Delete room</Button>
            )}
            <ButtonLink to={`/j/${room.code}`} variant="primary">Enter room</ButtonLink>
          </div>
        </div>
      </Panel>
      {deleting && (
        <Dialog open={deleting} onClose={() => setDeleting(false)} title="Delete room?" size="sm">
          <p className="text-sm text-muted">This removes <span className="font-medium text-fg">{room.name}</span> and all saved sessions in this folder. This action cannot be undone.</p>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeleting(false)}>Cancel</Button>
            <Button variant="danger" onClick={() => void remove()}>Delete</Button>
          </div>
        </Dialog>
      )}
      <div className={cx('grid grid-cols-[minmax(0,1fr)] items-start gap-4', desktop && 'xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]')}>
        <Panel>
          <PanelHeader title="Sessions" subtitle={`${room.name} › Sessions`} />
          <Async res={sessions}>
            {(list) => list.length === 0 ? <EmptyState icon={FolderOpen} title="No sessions yet" text="Your first session is saved here when it ends." /> : (
              <ul>{list.map((s) => (
                <li key={s.id}>
                  <button type="button" onClick={() => navigate(`/rooms/${room.id}/${s.id}`)} aria-current={s.id === sessionId ? 'true' : undefined}
                    className={cx('flex min-h-14 w-full items-center gap-3 border-b border-line px-4 py-2 text-left last:border-b-0 hover:bg-raised', s.id === sessionId && 'bg-accent-soft')}>
                    <FolderOpen size={16} className="text-muted" aria-hidden />
                    <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{s.title}</p><p className="text-xs text-muted">{formatDay(s.startedAt)} · {s.durationMin} min · {s.attendees} attended</p></div>
                    {s.qualityScore !== null && <span className="font-mono text-xs tabular text-muted">{s.qualityScore}%</span>}
                    <ChevronRight size={14} className="text-muted" aria-hidden />
                  </button>
                </li>
              ))}</ul>
            )}
          </Async>
        </Panel>
        {desktop && (sessionId ? <SessionFolder room={room} sessionId={sessionId} sessions={sessions.data} desktop /> : <Panel><EmptyState icon={FileText} title="Pick a session" text="Boards, doubts, materials and the recap for that day appear here." /></Panel>)}
      </div>
    </div>
  )
}

function SessionFolder({ room, sessionId, sessions, desktop }: { room: Room; sessionId: string; sessions?: { id: string; title: string; startedAt: string; durationMin: number }[]; desktop?: boolean }) {
  const items = useResource(() => repos.rooms.listArtifacts(sessionId), sessionId)
  const s = sessions?.find((x) => x.id === sessionId)
  return (
    <div className="flex flex-col gap-3">
      {!desktop && <Link to={`/rooms/${room.id}`} className="inline-flex h-11 items-center gap-1.5 self-start text-sm text-muted"><ArrowLeft size={14} aria-hidden />{room.name}</Link>}
      <Panel>
        <PanelHeader title={s?.title ?? 'Session'} subtitle={s ? `${room.name} › ${formatDate(s.startedAt)}, ${formatTime(s.startedAt)}` : room.name}
          />
        <Async res={items}>
          {(list) => list.length === 0 ? <EmptyState icon={FileText} title="No files yet" text={repos.kind === 'live' ? 'Session folders will show here once live rooms save them.' : 'Boards and recaps land here after a session.'} /> : (
            <ul>{list.map((a) => {
              const Icon = ARTIFACT_ICON[a.kind]
              return (
                <li key={a.id} className="flex min-h-14 items-center gap-3 border-b border-line px-4 py-2 last:border-b-0">
                  <Icon size={18} className="shrink-0 text-muted" aria-hidden />
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{a.title}</p><p className="truncate text-xs text-muted">{a.meta}</p></div>
                </li>
              )
            })}</ul>
          )}
        </Async>
      </Panel>
    </div>
  )
}
