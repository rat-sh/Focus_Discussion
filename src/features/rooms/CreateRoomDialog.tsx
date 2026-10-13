import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { repos } from '@/data'
import type { RoomMode } from '@/domain/types'
import { Button } from '@/shared/ui/Button'
import { Dialog } from '@/shared/ui/Dialog'
import { Field, Input } from '@/shared/ui/Field'
import { Tabs } from '@/shared/ui/Tabs'

const MODE_COPY = {
  live: 'Members can share live video, chat, a board, and YouTube playback.',
  mock: {
    study: 'Everyone can draw and run the timer.',
    teach: 'Only you draw by default. Give the stage to any friend with one tap.',
  },
} as const

export function CreateRoomDialog({ open, onClose, defaultMode = 'study' }: { open: boolean; onClose: () => void; defaultMode?: RoomMode }) {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [topic, setTopic] = useState('')
  const [mode, setMode] = useState<RoomMode>(defaultMode)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const valid = name.trim().length >= 2

  const create = async () => {
    setBusy(true)
    setError(null)
    try {
      const room = await repos.rooms.create({ name: name.trim(), topic: topic.trim() || 'General', mode })
      window.dispatchEvent(new CustomEvent('studyroom:rooms-changed'))
      setBusy(false)
      onClose()
      setName('')
      setTopic('')
      if (repos.kind === 'live') navigate(`/rooms/${room.id}`)
      else navigate(`/room/${room.code}`)
    } catch (e) {
      setBusy(false)
      setError(e instanceof Error ? e.message : 'Could not create room')
    }
  }
  return (
    <Dialog open={open} onClose={onClose} title="Start a room"
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!valid || busy} onClick={() => void create()}>{busy ? 'Creating…' : repos.kind === 'live' ? 'Create room' : 'Create and enter'}</Button></>}>
      <div className="flex flex-col gap-4">
        <Field label="Room name" error={error}>{(id) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. DBMS finals revision" maxLength={80} />}</Field>
        <Field label="Topic">{(id) => <Input id={id} value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Databases" maxLength={40} />}</Field>
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted">Mode</span>
          <Tabs variant="segment" label="Room mode" value={mode} onChange={setMode} items={[{ id: 'study', label: 'Study together' }, { id: 'teach', label: 'Teach' }]} />
          <p className="text-xs text-muted">{repos.kind === 'live' ? MODE_COPY.live : MODE_COPY.mock[mode]}</p>
          {repos.kind === 'live' && <p className="text-xs text-muted">The room and invite code are saved. Enter the room to connect camera and microphone.</p>}
        </div>
      </div>
    </Dialog>
  )
}
