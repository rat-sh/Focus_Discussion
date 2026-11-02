import { useState, type FormEvent, type ReactNode } from 'react'
import { Check, Circle, CircleAlert, MailCheck, ShieldCheck } from 'lucide-react'
import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { BRAND } from '@/config/brand'
import { useAuth } from '@/shared/context/auth'
import { safeInternalPath } from '@/shared/lib/internalPath'
import { Button } from '@/shared/ui/Button'
import { Field, Input } from '@/shared/ui/Field'
import { Panel } from '@/shared/ui/Panel'

function messageOf(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message
    const normalized = message.toLowerCase()
    if (normalized.includes('invalid login credentials')) {
      return 'That email and password do not match. Check them and try again, or reset your password.'
    }
    if (normalized.includes('email not confirmed')) {
      return 'Please confirm your email using the link we sent before signing in.'
    }
    if (normalized.includes('failed to fetch') || normalized.includes('network')) {
      return 'We could not connect to Focus Lock. Check your internet connection and try again.'
    }
    return message
  }
  return 'Something went wrong. Please try again.'
}

function AuthMessage({ children, success = false }: { children: ReactNode; success?: boolean }) {
  return (
    <div role={success ? 'status' : 'alert'} className={`flex gap-2 rounded-ui border p-3 text-sm ${success ? 'border-accent/40 bg-accent/5 text-fg' : 'border-danger/40 bg-danger/5 text-danger'}`}>
      {success ? <MailCheck size={18} className="mt-0.5 shrink-0 text-accent" aria-hidden /> : <CircleAlert size={18} className="mt-0.5 shrink-0" aria-hidden />}
      <div>{children}</div>
    </div>
  )
}

function AuthInitNotice() {
  const { initializationError } = useAuth()
  if (!initializationError) return null
  return <AuthMessage>Could not check your saved sign-in session: {initializationError} Check your connection or environment settings, then reload.</AuthMessage>
}

export function SignInPage() {
  const { signedIn, signIn } = useAuth()
  const nav = useNavigate()
  const loc = useLocation()
  const from = safeInternalPath((loc.state as { from?: string } | null)?.from)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  if (signedIn) return <Navigate to={from} replace />

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await signIn(email.trim(), password)
      nav(from, { replace: true })
    } catch (cause) {
      setError(messageOf(cause))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to pick up where your study group left off.">
      <AuthInitNotice />
      <form className="flex flex-col gap-4" onSubmit={(event) => void submit(event)}>
        <Field label="Email address">{(id) => <Input id={id} type="email" inputMode="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />}</Field>
        <Field label="Password">{(id) => <Input id={id} type="password" autoComplete="current-password" placeholder="Your password" value={password} onChange={(e) => setPassword(e.target.value)} required />}</Field>
        <div className="-mt-2 text-right text-sm"><Link className="text-accent underline-offset-4 hover:underline" to="/forgot-password" state={{ from }}>Forgot password?</Link></div>
        {error && <AuthMessage>{error}</AuthMessage>}
        <Button variant="primary" size="lg" type="submit" disabled={busy || !email || !password}>
          {busy ? 'Signing in…' : 'Sign in'}
        </Button>
        <p className="text-center text-sm text-muted">New to Focus Lock? <Link className="font-medium text-accent underline-offset-4 hover:underline" to="/signup" state={{ from }}>Create an account</Link></p>
      </form>
    </AuthLayout>
  )
}

export function SignUpPage() {
  const { signedIn, signUp } = useAuth()
  const nav = useNavigate()
  const loc = useLocation()
  const from = safeInternalPath((loc.state as { from?: string } | null)?.from)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [handle, setHandle] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  if (signedIn) return <Navigate to={from} replace />

  const handleOk = /^[a-z0-9._]{3,24}$/.test(handle.trim().toLowerCase())
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  const nameOk = name.trim().length >= 1
  const passwordOk = password.length >= 10
  const valid = emailOk && passwordOk && nameOk && handleOk

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const result = await signUp({ email: email.trim(), password, name: name.trim(), handle: handle.trim().toLowerCase() }, from)
      if (result.confirmationRequired) setConfirmationEmail(email.trim())
      else nav(from, { replace: true })
    } catch (cause) {
      setError(messageOf(cause))
    } finally {
      setBusy(false)
    }
  }

  if (confirmationEmail) {
    return (
      <AuthLayout title="Check your inbox" subtitle="One quick step before you can start studying.">
        <AuthMessage success>
          <p className="font-semibold">Confirmation email sent</p>
          <p className="mt-1 text-muted">We sent a sign-up link to <strong className="text-fg">{confirmationEmail}</strong>. Open it to confirm your email, then come back here to sign in.</p>
        </AuthMessage>
        <ol className="flex flex-col gap-2 text-sm text-muted">
          <li className="flex gap-2"><span className="font-semibold text-fg">1.</span> Open the message from Focus Lock.</li>
          <li className="flex gap-2"><span className="font-semibold text-fg">2.</span> Select the confirmation link.</li>
          <li className="flex gap-2"><span className="font-semibold text-fg">3.</span> Return here and sign in.</li>
        </ol>
        <Button variant="primary" size="lg" onClick={() => nav('/signin', { replace: true, state: { from } })}>Go to sign in</Button>
        <p className="text-center text-xs text-muted">No email yet? Check your spam folder. The link may take a minute to arrive.</p>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Create your account" subtitle="Set up your Focus Lock profile. It only takes a minute.">
      <AuthInitNotice />
      <form className="flex flex-col gap-4" onSubmit={(event) => void submit(event)}>
        <Field label="Your name" hint="Shown to people in your study rooms.">{(id) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoComplete="name" placeholder="e.g. Alex Morgan" required />}</Field>
        <Field label="Username" hint="Your profile link · 3–24 lowercase letters, numbers, dots or underscores.">{(id) => <Input id={id} value={handle} onChange={(e) => setHandle(e.target.value)} maxLength={24} autoComplete="username" placeholder="e.g. alex.morgan" required />}</Field>
        <Field label="Email address" hint="Used to sign in and recover your account.">{(id) => <Input id={id} type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />}</Field>
        <Field label="Create a password" hint="Use at least 10 characters.">{(id) => <Input id={id} type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 10 characters" minLength={10} required />}</Field>
        <div className="rounded-ui border border-line bg-raised/50 p-3">
          <p className="mb-2 text-xs font-medium text-muted">Before you continue</p>
          <ul className="grid grid-cols-2 gap-2 text-xs">
            <Requirement met={nameOk}>Name added</Requirement>
            <Requirement met={handleOk}>Username valid</Requirement>
            <Requirement met={emailOk}>Email looks right</Requirement>
            <Requirement met={passwordOk}>10+ character password</Requirement>
          </ul>
        </div>
        {error && <AuthMessage>{error}</AuthMessage>}
        <p className="text-xs leading-relaxed text-muted">By creating an account, you agree to use Focus Lock respectfully. Your password is handled securely by Supabase and is never visible to other members.</p>
        <Button variant="primary" size="lg" type="submit" disabled={busy || !valid}>
          {busy ? 'Creating your account…' : 'Create account'}
        </Button>
        <p className="text-center text-sm text-muted">Already have an account? <Link className="font-medium text-accent underline-offset-4 hover:underline" to="/signin" state={{ from }}>Sign in</Link></p>
      </form>
    </AuthLayout>
  )
}

function Requirement({ met, children }: { met: boolean; children: ReactNode }) {
  const Icon = met ? Check : Circle
  return <li className={`flex items-center gap-1.5 ${met ? 'text-accent' : 'text-muted'}`}><Icon size={14} aria-hidden />{children}</li>
}

export function ForgotPasswordPage() {
  const { signedIn, requestPasswordReset } = useAuth()
  const loc = useLocation()
  const from = safeInternalPath((loc.state as { from?: string } | null)?.from)
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  if (signedIn) return <Navigate to={from} replace />

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await requestPasswordReset(email.trim(), from)
      setSent(true)
    } catch (cause) {
      setError(messageOf(cause))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout title={sent ? 'Check your inbox' : 'Reset your password'} subtitle={sent ? 'Follow the link in the email to choose a new password.' : 'We’ll email you a secure link to reset your password.'}>
      {sent ? (
        <>
          <AuthMessage success>
            <p className="font-semibold">If an account exists for this email, a reset link is on its way.</p>
            <p className="mt-1 text-muted">Check your inbox and spam folder. For your privacy, we can’t confirm whether an email is registered.</p>
          </AuthMessage>
          <p className="text-sm text-muted">Reset link sent to <strong className="text-fg">{email.trim()}</strong></p>
          <Link className="text-center text-sm font-medium text-accent underline-offset-4 hover:underline" to="/signin" state={{ from }}>Back to sign in</Link>
        </>
      ) : (
        <form className="flex flex-col gap-4" onSubmit={(event) => void submit(event)}>
          <AuthInitNotice />
          <div className="rounded-ui border border-line bg-raised/50 p-3 text-sm text-muted">
            Enter the email address you used to create your account. We’ll send a one-time link; you can then choose a new password.
          </div>
          <Field label="Email address">{(id) => <Input id={id} type="email" inputMode="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />}</Field>
          {error && <AuthMessage>{error}</AuthMessage>}
          <Button variant="primary" size="lg" type="submit" disabled={busy || !email.trim()}>
            {busy ? 'Sending reset link…' : 'Send reset link'}
          </Button>
          <p className="text-center text-sm text-muted"><Link className="font-medium text-accent underline-offset-4 hover:underline" to="/signin" state={{ from }}>Back to sign in</Link></p>
        </form>
      )}
    </AuthLayout>
  )
}

export function ResetPasswordPage() {
  const { ready, signedIn, updatePassword } = useAuth()
  const nav = useNavigate()
  const loc = useLocation()
  const from = safeInternalPath(new URLSearchParams(loc.search).get('next'))
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (password !== confirm) {
      setError('Those passwords do not match yet.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await updatePassword(password)
      setSaved(true)
    } catch (cause) {
      setError(messageOf(cause))
    } finally {
      setBusy(false)
    }
  }

  if (!ready) return <div className="min-h-dvh bg-canvas" />
  if (!signedIn) {
    return (
      <AuthLayout title="Reset link unavailable" subtitle="For your security, reset links are short-lived and can only be used once.">
        <AuthMessage>The link may have expired or already been used. Request a fresh reset link to continue.</AuthMessage>
        <Link className="text-center text-sm font-medium text-accent underline-offset-4 hover:underline" to="/forgot-password">Request another reset link</Link>
      </AuthLayout>
    )
  }
  if (saved) {
    return (
      <AuthLayout title="Password updated" subtitle="Your account is ready to use with your new password.">
        <AuthMessage success><p className="font-semibold">Your password has been changed.</p></AuthMessage>
        <Button variant="primary" size="lg" onClick={() => nav(from, { replace: true })}>Continue to Focus Lock</Button>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Choose a new password" subtitle="Make it unique and at least 10 characters long.">
      <form className="flex flex-col gap-4" onSubmit={(event) => void submit(event)}>
        <div className="flex items-start gap-2 rounded-ui border border-line bg-raised/50 p-3 text-sm text-muted">
          <ShieldCheck size={18} className="mt-0.5 shrink-0 text-accent" aria-hidden />
          <p>Your reset link securely verified your account. Choose a password you haven’t used elsewhere.</p>
        </div>
        <Field label="New password">{(id) => <Input id={id} type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={10} required />}</Field>
        <Field label="Confirm new password">{(id) => <Input id={id} type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} minLength={10} required />}</Field>
        {error && <AuthMessage>{error}</AuthMessage>}
        <Button variant="primary" size="lg" type="submit" disabled={busy || password.length < 10 || !confirm}>
          {busy ? 'Updating password…' : 'Update password'}
        </Button>
      </form>
    </AuthLayout>
  )
}

function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <main className="pt-safe pb-safe flex min-h-dvh flex-col items-center justify-center bg-canvas px-4 py-8">
      <Link to="/" className="mb-5 font-mono text-sm font-bold text-accent">{BRAND.name}</Link>
      <Panel className="flex w-full max-w-md flex-col gap-4 p-5 sm:p-6">
        <header>
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm leading-relaxed text-muted">{subtitle}</p>
        </header>
        {children}
        <p className="border-t border-line pt-3 text-center text-xs text-muted">A focused space to learn together.</p>
      </Panel>
    </main>
  )
}

export function RequireAuth() {
  const { ready, signedIn } = useAuth()
  const loc = useLocation()
  if (!ready) return <div className="min-h-dvh bg-canvas" />
  if (!signedIn) return <Navigate to="/signin" replace state={{ from: loc.pathname }} />
  return <Outlet />
}
