import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Mic, MicOff, Video, VideoOff, Users } from 'lucide-react'
import { BRAND } from '@/config/brand'
import { USE_MOCK } from '@/config/env'
import { repos } from '@/data'
import { useResource } from '@/data/hooks'
import { useProfile } from '@/shared/context/profile'
import { Button, ButtonLink } from '@/shared/ui/Button'
import { Field, Input } from '@/shared/ui/Field'
import { Skeleton } from '@/shared/ui/Feedback'
import { Panel } from '@/shared/ui/Panel'
import { cx } from '@/shared/lib/cx'

function DeviceToggle({ on, onChange, onIcon: On, offIcon: Off, label }: { on: boolean; onChange: (v: boolean) => void; onIcon: typeof Mic; offIcon: typeof Mic; label: string }) {
  const Icon = on ? On : Off
  return (
    <button type="button" aria-pressed={on} onClick={() => onChange(!on)}
      className={cx('flex h-14 flex-1 flex-col items-center justify-center gap-1 rounded-ui border text-xs', on ? 'border-accent bg-accent-soft text-fg' : 'border-line bg-raised text-muted')}>
      <Icon size={18} aria-hidden />{label} {on ? 'on' : 'off'}
    </button>
  )
}

export function JoinPage() {
  const { code = '' } = useParams()
  const navigate = useNavigate()
  const { profile } = useProfile()
  const preview = useResource(() => repos.rooms.preview(code), code)
  const [nameOverride, setNameOverride] = useState<string | null>(null)
  const name = nameOverride ?? profile?.name ?? ''
  const [mic, setMic] = useState(false)
  const [cam, setCam] = useState(false)
  const [busy, setBusy] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)
  const p = preview.data
  const ok = p?.availability === 'open'

  const enter = async () => {
    if (!p) return
    setJoinError(null)
    if (!USE_MOCK && (mic || cam)) {
      if (!navigator.mediaDevices?.getUserMedia) {
        setJoinError('This browser cannot access a camera or microphone. Use a supported browser over HTTPS or localhost.')
        return
      }
      try {
        const permissionStream = await navigator.mediaDevices.getUserMedia({ audio: mic, video: cam })
        permissionStream.getTracks().forEach((track) => track.stop())
      } catch (cause) {
        const reason = cause instanceof DOMException && cause.name === 'NotAllowedError'
          ? 'Camera or microphone permission was blocked. Allow access in your browser’s site settings, or switch that device off to join without it.'
          : cause instanceof DOMException && cause.name === 'NotFoundError'
            ? 'A selected camera or microphone was not found. Connect a device or switch it off to join.'
            : cause instanceof Error ? cause.message : 'Could not access the selected devices.'
        setJoinError(reason)
        return
      }
    }
    if (!USE_MOCK) {
      if (!profile) { navigate('/signin', { state: { from: `/j/${code}` } }); return }
      setBusy(true)
      try {
        await repos.rooms.join(p.code)
        window.dispatchEvent(new CustomEvent('studyroom:rooms-changed'))
      } catch (e) {
        setBusy(false)
        setJoinError(e instanceof Error ? e.message : 'Could not join')
        return
      }
      setBusy(false)
    }
    navigate(`/room/${p.code}`, { state: { name: name.trim(), mic, cam } })
  }

  return (
    <div className="pt-safe pb-safe flex min-h-dvh flex-col items-center justify-center bg-canvas px-4 py-8">
      <Link to="/" aria-label={`${BRAND.name} home`} className="mb-6 flex h-10 w-10 items-center justify-center rounded-ui bg-accent font-mono font-bold text-accent-fg">{BRAND.short}</Link>
      <Panel className="w-full max-w-md p-5">
        {!p ? <div className="flex flex-col gap-3"><Skeleton className="h-6 w-2/3" /><Skeleton className="h-4 w-1/2" /><Skeleton className="h-11" /></div> : ok ? (
          <div className="flex flex-col gap-5">
            <div>
              <p className="text-xs text-muted">You are invited to</p>
              <h1 className="mt-0.5 text-xl font-semibold">{p.name}</h1>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted"><Users size={14} aria-hidden />Hosted by {p.hostName} · {p.insideCount} inside now</p>
            </div>
            <Field label="Your name">{(id) => <Input id={id} value={name} onChange={(e) => setNameOverride(e.target.value)} maxLength={40} autoComplete="name" />}</Field>
            <div className="flex gap-2">
              <DeviceToggle on={mic} onChange={setMic} onIcon={Mic} offIcon={MicOff} label="Mic" />
              <DeviceToggle on={cam} onChange={setCam} onIcon={Video} offIcon={VideoOff} label="Camera" />
            </div>
            <p className="text-xs leading-relaxed text-muted">Choose which devices to use. When you join, your browser will ask permission for each one you turn on. Nothing is recorded.</p>
            {joinError && <p role="alert" className="text-xs text-danger">{joinError}</p>}
            <Button variant="primary" size="lg" disabled={name.trim().length < 2 || busy} onClick={() => void enter()}>{busy ? 'Joining…' : 'Join room'}</Button>
            <p className="text-center text-xs text-muted">{USE_MOCK ? 'No account needed. This is a preview; camera and microphone are not connected.' : 'Your account is required. You can join with both devices off and turn them on later.'}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <h1 className="text-lg font-semibold">{p.availability === 'full' ? 'This room is full' : p.availability === 'expired' ? 'This link has expired' : 'Room not found'}</h1>
            <p className="text-sm text-muted">{p.availability === 'full' ? `${p.name} has reached its limit of ${p.insideCount} people. Ask the host to make space.` : p.availability === 'expired' ? 'Ask the host for a new invite link.' : 'Check the code, or ask the host to send the link again.'}</p>
            <ButtonLink to="/" variant="primary">Go home</ButtonLink>
          </div>
        )}
      </Panel>
    </div>
  )
}
