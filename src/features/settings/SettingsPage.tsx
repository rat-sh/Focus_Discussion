import { useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, Eye, EyeOff, Trash2 } from 'lucide-react'
import { repos } from '@/data'
import { STATE_META } from '@/domain/focus'
import type { CameraMode } from '@/domain/types'
import { useProfile } from '@/shared/context/profile'
import { useTheme } from '@/shared/context/theme'
import { Avatar } from '@/shared/ui/Avatar'
import { Button } from '@/shared/ui/Button'
import { Field, Input } from '@/shared/ui/Field'
import { Panel, PageHeader } from '@/shared/ui/Panel'
import { Tabs } from '@/shared/ui/Tabs'
import { Toggle } from '@/shared/ui/Toggle'
import { useToast } from '@/shared/ui/Toast'
import { squareThumb } from '@/shared/lib/image'
import { USE_MOCK } from '@/config/env'
import { useAuth } from '@/shared/context/auth'
import { usePrefs } from './prefs'
import type { Profile } from '@/domain/types'

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <Panel>
      <div className="border-b border-line px-4 py-3"><h2 className="text-sm font-semibold">{title}</h2>{subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}</div>
      <div className="flex flex-col gap-4 p-4">{children}</div>
    </Panel>
  )
}
const Row = ({ title, text, control }: { title: string; text?: string; control: ReactNode }) => (
  <div className="flex items-center justify-between gap-4"><div className="min-w-0"><p className="text-sm">{title}</p>{text && <p className="text-xs text-muted">{text}</p>}</div>{control}</div>
)

export function SettingsPage() {
  const { profile } = useProfile()
  return profile ? <SettingsForm key={profile.id} profile={profile} /> : null
}

function SettingsForm({ profile }: { profile: Profile }) {
  const { setProfile } = useProfile()
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const { theme, toggle } = useTheme()
  const [prefs, setPrefs] = usePrefs()
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState(profile.name)
  const [handle, setHandle] = useState(profile.handle)
  const [busy, setBusy] = useState(false)

  const reportAvatarError = async (cause: unknown, fallback: string) => {
    const message = cause instanceof Error ? cause.message : fallback
    try {
      setProfile(await repos.profile.get())
      toast(message, 'error')
    } catch (refreshCause) {
      const refreshMessage = refreshCause instanceof Error ? refreshCause.message : 'Could not refresh the profile'
      toast(`${message}. ${refreshMessage}`, 'error')
    }
  }

  const onPhoto = async (file?: File) => {
    if (!file) return
    const supportedType = repos.kind === 'live'
      ? ['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
      : file.type.startsWith('image/')
    const maxSize = repos.kind === 'live' ? 5 * 1024 * 1024 : 8 * 1024 * 1024
    if (!supportedType) { toast(repos.kind === 'live' ? 'Choose a JPEG, PNG, or WebP image' : 'Choose an image file', 'error'); return }
    if (file.size > maxSize) { toast(repos.kind === 'live' ? 'Profile photos must be 5 MB or smaller' : 'Image is larger than 8 MB', 'error'); return }
    setBusy(true)
    try {
      setProfile(await repos.profile.setAvatar(await squareThumb(file)))
      toast('Profile photo updated')
    } catch (cause) {
      await reportAvatarError(cause, 'Could not upload the profile photo')
    } finally {
      setBusy(false)
    }
  }
  const saveProfile = async () => { setProfile(await repos.profile.update({ name: name.trim(), handle: handle.trim() })); toast('Profile saved') }

  return (
    <>
      <title>Settings - Focus Lock</title>
      <PageHeader title="Settings" />
      <div className="mx-auto flex max-w-2xl flex-col gap-4 md:mx-0">
        <Section title="Profile">
          <div className="flex items-center gap-4">
            <Avatar name={profile.name} url={profile.avatarUrl} size={72} />
            <div className="flex flex-wrap gap-2">
              <input ref={fileRef} type="file" accept={repos.kind === 'live' ? 'image/jpeg,image/png,image/webp' : 'image/*'} className="sr-only" aria-label="Upload profile photo" onChange={(e) => { void onPhoto(e.target.files?.[0]); e.currentTarget.value = '' }} />
              <Button icon={Camera} disabled={busy} onClick={() => fileRef.current?.click()}>{profile.avatarUrl ? 'Change photo' : 'Upload photo'}</Button>
              {profile.avatarUrl && <Button variant="ghost" icon={Trash2} disabled={busy} onClick={async () => {
                setBusy(true)
                try { setProfile(await repos.profile.setAvatar(null)); toast('Photo removed') }
                catch (cause) { await reportAvatarError(cause, 'Could not remove the profile photo') }
                finally { setBusy(false) }
              }}>Remove</Button>}
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Display name">{(id) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoComplete="name" />}</Field>
            <Field label="Handle" hint="Friends find you with this.">{(id) => <Input id={id} value={handle} onChange={(e) => setHandle(e.target.value.replace(/[^a-z0-9._]/gi, '').toLowerCase())} maxLength={24} autoComplete="username" />}</Field>
          </div>
          <div><Button variant="primary" disabled={name.trim().length < 2 || handle.length < 3} onClick={() => void saveProfile()}>Save profile</Button></div>
        </Section>

        <Section title="Focus and privacy" subtitle="Face and phone checks run on your device. Video and landmarks are never uploaded or stored. Focus estimates are not a measure of understanding.">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted">Camera tile</span>
            <Tabs variant="segment" label="Camera tile" value={prefs.cameraMode} onChange={(v: CameraMode) => setPrefs((p) => ({ ...p, cameraMode: v }))}
              items={[{ id: 'visible', label: 'Show my face', icon: Eye }, { id: 'hidden', label: 'Blank tile', icon: EyeOff }]} />
          </div>
          <Field label={`Rest budget: ${prefs.restBudgetPct}% of session time`} hint={`Time in ${STATE_META.resting.label.toLowerCase()} within this budget is not penalised.`}>
            {(id) => <input id={id} type="range" min={0} max={30} step={5} value={prefs.restBudgetPct} onChange={(e) => setPrefs((p) => ({ ...p, restBudgetPct: Number(e.target.value) }))} className="h-11 w-full accent-[var(--accent)] md:h-6" />}
          </Field>
        </Section>

        <Section title="Appearance">
          <Row title="Light theme" control={<Toggle label="Light theme" checked={theme === 'light'} onChange={toggle} />} />
        </Section>

        {!USE_MOCK && (
          <Section title="Account">
            <Button variant="danger" onClick={() => { void signOut().then(() => navigate('/signin')) }}>Sign out</Button>
          </Section>
        )}
      </div>
    </>
  )
}
