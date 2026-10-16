import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { BRAND } from '@/config/brand'
import { parseRoomCode, roomJoinPath } from '@/shared/lib/roomLinks'
import { Button } from '@/shared/ui/Button'
import { Field, Input } from '@/shared/ui/Field'
import { Panel } from '@/shared/ui/Panel'

export function JoinByCodePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const initialCode = (location.state as { code?: string } | null)?.code ?? ''
  const [value, setValue] = useState(initialCode)
  const [error, setError] = useState<string | null>(null)

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const code = parseRoomCode(value)
    if (!code) {
      setError('Enter a valid room code, or paste a Focus Lock room invite link.')
      return
    }
    navigate(roomJoinPath(code))
  }

  return (
    <main className="pt-safe pb-safe flex min-h-dvh flex-col items-center justify-center bg-canvas px-4 py-8">
      <Link to="/" aria-label={`${BRAND.name} home`} className="mb-6 font-mono text-sm font-bold text-accent">{BRAND.name}</Link>
      <Panel className="w-full max-w-md p-5 sm:p-6">
        <div className="mb-5">
          <h1 className="text-xl font-semibold tracking-tight">Join with a code</h1>
          <p className="mt-1 text-sm leading-relaxed text-muted">Enter the room code your host shared, or paste their invite link.</p>
        </div>
        <form className="flex flex-col gap-4" onSubmit={submit}>
          <Field label="Room code or invite link" error={error}>
            {(id) => <Input id={id} value={value} onChange={(event) => { setValue(event.target.value); setError(null) }} autoComplete="off" autoCapitalize="characters" placeholder="e.g. AB12CD34" />}
          </Field>
          <Button variant="primary" size="lg" type="submit" icon={ArrowRight} disabled={!value.trim()}>Continue</Button>
        </form>
        <p className="mt-4 text-center text-xs text-muted">You can review the room before joining. An account is required to enter a live room.</p>
      </Panel>
    </main>
  )
}
