import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { USE_MOCK } from '@/config/env'
import { ApiError } from '@/shared/lib/apiError'

interface AuthValue {
  ready: boolean
  signedIn: boolean
  initializationError: string | null
  signIn: (email: string, password: string) => Promise<void>
  signUp: (input: { email: string; password: string; name: string; handle: string }) => Promise<{ confirmationRequired: boolean }>
  requestPasswordReset: (email: string) => Promise<void>
  updatePassword: (password: string) => Promise<void>
  signOut: () => Promise<void>
}

const Ctx = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(USE_MOCK)
  const [signedIn, setSignedIn] = useState(USE_MOCK)
  const [initializationError, setInitializationError] = useState<string | null>(null)

  useEffect(() => {
    if (USE_MOCK) return
    let off: (() => void) | undefined
    let active = true
    void (async () => {
      try {
        const { getSupabase } = await import('@/data/supabase/client')
        const sb = getSupabase()
        const { data, error } = await sb.auth.getSession()
        if (error) throw error
        if (!active) return
        setSignedIn(Boolean(data.session))
        const { data: sub } = sb.auth.onAuthStateChange((_e, session) => {
          setSignedIn(Boolean(session))
        })
        off = () => sub.subscription.unsubscribe()
      } catch (error) {
        if (active) {
          setSignedIn(false)
          setInitializationError(error instanceof Error ? error.message : 'Could not check your saved sign-in session.')
        }
      } finally {
        if (active) setReady(true)
      }
    })()
    return () => {
      active = false
      off?.()
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const { getSupabase } = await import('@/data/supabase/client')
    const { error } = await getSupabase().auth.signInWithPassword({ email, password })
    if (error) throw new ApiError('UNAUTHENTICATED', error.message, 401)
  }, [])

  const signUp = useCallback(async (input: { email: string; password: string; name: string; handle: string }) => {
    const { getSupabase } = await import('@/data/supabase/client')
    const { data, error } = await getSupabase().auth.signUp({
      email: input.email,
      password: input.password,
      options: { data: { name: input.name, handle: input.handle.toLowerCase() } },
    })
    if (error) throw new ApiError('VALIDATION_FAILED', error.message, 400)
    return { confirmationRequired: !data.session }
  }, [])

  const requestPasswordReset = useCallback(async (email: string) => {
    const { getSupabase } = await import('@/data/supabase/client')
    const { error } = await getSupabase().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) throw new ApiError('INTERNAL', error.message, 400)
  }, [])

  const updatePassword = useCallback(async (password: string) => {
    const { getSupabase } = await import('@/data/supabase/client')
    const { error } = await getSupabase().auth.updateUser({ password })
    if (error) throw new ApiError('INTERNAL', error.message, 400)
  }, [])

  const signOut = useCallback(async () => {
    if (USE_MOCK) return
    const { getSupabase } = await import('@/data/supabase/client')
    await getSupabase().auth.signOut()
  }, [])

  const value = useMemo(
    () => ({ ready, signedIn, initializationError, signIn, signUp, requestPasswordReset, updatePassword, signOut }),
    [ready, signedIn, initializationError, signIn, signUp, requestPasswordReset, updatePassword, signOut],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useAuth outside AuthProvider')
  return c
}
