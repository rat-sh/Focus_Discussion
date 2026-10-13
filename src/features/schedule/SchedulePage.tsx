import { useState } from 'react'
import { CalendarPlus, Copy, Pencil, Repeat, Trash2 } from 'lucide-react'
import { repos } from '@/data'
import { useResource } from '@/data/hooks'
import type { ScheduledSession } from '@/domain/types'
import { BRAND } from '@/config/brand'
import { Button, ButtonLink } from '@/shared/ui/Button'
import { Dialog } from '@/shared/ui/Dialog'
import { Async, Badge, EmptyState } from '@/shared/ui/Feedback'
import { Field, Input } from '@/shared/ui/Field'
import { Panel, PageHeader } from '@/shared/ui/Panel'
import { useToast } from '@/shared/ui/Toast'
import { formatDay, formatTime } from '@/shared/lib/format'

export function SchedulePage() {
  const list = useResource(() => repos.schedule.upcoming())
  const rooms = useResource(() => repos.kind === 'live' ? repos.rooms.listMine() : Promise.resolve([]), repos.kind)
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<ScheduledSession | null>(null)
  const [title, setTitle] = useState('')
  const [topic, setTopic] = useState('General')
  const [when, setWhen] = useState('')
  const [dur, setDur] = useState('60')
  const [roomId, setRoomId] = useState('')
  const selectedRoomId = roomId || rooms.data?.[0]?.id || ''
  const durationMin = Number(dur)
  const startsAt = when ? Date.parse(when) : Number.NaN
  const valid = title.trim().length >= 2 && when !== '' &&
    (repos.kind === 'mock' || (Number.isFinite(startsAt) &&
    Number.isInteger(durationMin) && durationMin >= 15 && durationMin <= 240 &&
    topic.trim().length > 0 &&
    Boolean(selectedRoomId)))

  const openCreate = () => {
    setEditing(null); setTitle(''); setTopic('General'); setWhen(''); setDur('60'); setRoomId(''); setOpen(true)
  }
  const openEdit = (session: ScheduledSession) => {
    const date = new Date(session.startsAt)
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
    setEditing(session); setTitle(session.title); setTopic(session.topic); setWhen(localDate); setDur(String(session.durationMin)); setRoomId(session.roomId ?? ''); setOpen(true)
  }

  const save = async () => {
    if (repos.kind === 'live' && startsAt <= Date.now()) {
      toast('Choose a start time in the future', 'error')
      return
    }
    try {
      const input = {
        ...(repos.kind === 'live' ? { roomId: selectedRoomId } : {}),
        title: title.trim(),
        topic: repos.kind === 'live' ? topic.trim() : 'General',
        startsAt: new Date(when).toISOString(),
        durationMin: repos.kind === 'mock' ? Number(dur) || 60 : durationMin,
      }
      if (editing && repos.kind === 'live') await repos.schedule.update(editing.id, { ...input, roomId: selectedRoomId })
      else await repos.schedule.create(input)
      setOpen(false); setEditing(null); setTitle(''); setWhen('')
      await list.reload()
      toast(editing ? 'Session updated' : 'Session scheduled')
    } catch (cause) {
      toast(cause instanceof Error ? cause.message : 'Could not save this session', 'error')
    }
  }
  const cancelSession = async (session: ScheduledSession) => {
    if (!window.confirm(`Cancel "${session.title}"?`)) return
    try {
      await repos.schedule.remove(session.id)
      await list.reload()
      toast('Session cancelled')
    } catch (cause) {
      toast(cause instanceof Error ? cause.message : 'Could not cancel this session', 'error')
    }
  }
  const copyReminder = async (t: string, at: string, code: string) => {
    const text = `${t} · ${formatDay(at)} ${formatTime(at)}\nJoin: https://${BRAND.domain}/j/${code}`
    try { await navigator.clipboard.writeText(text); toast('Reminder copied for WhatsApp') } catch { toast('Copy is blocked by the browser', 'error') }
  }
  return (
    <>
      <PageHeader title="Schedule" subtitle={repos.kind === 'live' ? 'Plan upcoming sessions in rooms you belong to.' : 'Planned sessions. The invite link works before the session starts.'}
        actions={<Button variant="primary" icon={CalendarPlus} onClick={openCreate}>Schedule a session</Button>} />
      <Panel>
        <Async res={list}>
          {(items) => items.length === 0 ? <EmptyState icon={CalendarPlus} title="Nothing scheduled" text="Plan a session so your friends can join with one tap." /> : (
            <ul>{items.map((s) => (
              <li key={s.id} className="flex flex-col gap-2 border-b border-line px-4 py-3 last:border-b-0 md:flex-row md:items-center md:gap-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{s.title}</p>
                  <p className="text-xs text-muted">{formatDay(s.startsAt)} · {formatTime(s.startsAt)} · {s.durationMin} min · {s.going} {repos.kind === 'live' ? 'room members' : 'going'}</p>
                </div>
                <div className="flex items-center gap-2">
                  {s.recurring && <Badge><Repeat size={12} className="mr-1" aria-hidden />{s.recurring}</Badge>}
                  <Button size="sm" icon={Copy} onClick={() => void copyReminder(s.title, s.startsAt, s.roomCode)}>Copy reminder</Button>
                  <ButtonLink to={`/j/${s.roomCode}`} size="sm" variant="primary">Join</ButtonLink>
                  {repos.kind === 'live' && s.isOrganizer && <>
                    <Button size="sm" icon={Pencil} onClick={() => openEdit(s)}>Edit</Button>
                    <Button size="sm" variant="danger" icon={Trash2} onClick={() => void cancelSession(s)}>Cancel</Button>
                  </>}
                </div>
              </li>
            ))}</ul>
          )}
        </Async>
      </Panel>
      <Dialog open={open} onClose={() => { setOpen(false); setEditing(null) }} title={editing ? 'Edit session' : 'Schedule a session'}
        footer={<><Button variant="ghost" onClick={() => { setOpen(false); setEditing(null) }}>Cancel</Button><Button variant="primary" disabled={!valid} onClick={() => void save()}>{editing ? 'Save changes' : 'Schedule'}</Button></>}>
        <div className="flex flex-col gap-4">
          <Field label="Title">{(id) => <Input id={id} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Graphs revision" />}</Field>
          {repos.kind === 'live' && <>
            <Field label="Room">{(id) => <select id={id} value={selectedRoomId} onChange={(e) => setRoomId(e.target.value)} className="h-11 rounded-ui border border-line bg-canvas px-3 text-sm text-fg" disabled={rooms.loading || !rooms.data?.length}>
              {!rooms.data?.length && <option value="">{rooms.loading ? 'Loading rooms…' : 'No rooms available'}</option>}
              {rooms.data?.map((room) => <option key={room.id} value={room.id}>{room.name} · {room.code}</option>)}
            </select>}</Field>
            {rooms.error && <p role="alert" className="text-xs text-danger">{rooms.error.message}</p>}
            {!rooms.loading && rooms.data?.length === 0 && <p className="text-xs text-muted">Join or create a room before scheduling a session.</p>}
            <Field label="Topic">{(id) => <Input id={id} value={topic} onChange={(e) => setTopic(e.target.value)} maxLength={120} />}</Field>
          </>}
          <Field label="Starts at">{(id) => <Input id={id} type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />}</Field>
          <Field label="Duration (minutes)">{(id) => <Input id={id} type="number" inputMode="numeric" min={15} max={240} value={dur} onChange={(e) => setDur(e.target.value)} />}</Field>
        </div>
      </Dialog>
    </>
  )
}
