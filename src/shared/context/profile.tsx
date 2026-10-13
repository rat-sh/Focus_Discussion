import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { USE_MOCK } from '@/config/env'
import { repos } from '@/data'
import type { Profile } from '@/domain/types'
import { useAuth } from './auth'

interface Value { profile: Profile | null; setProfile: (p: Profile) => void; refresh: () => Promise<void> }
const Ctx = createContext<Value | null>(null)

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { ready, signedIn } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const refresh = useCallback(async () => {
    await Promise.resolve()
    if (!USE_MOCK && !signedIn) { setProfile(null); return }
    setProfile(await repos.profile.get())
  }, [signedIn])
  useEffect(() => {
    if (!ready) return
    void Promise.resolve().then(refresh)
  }, [ready, refresh])
  const value = useMemo(() => ({ profile, setProfile, refresh }), [profile, refresh])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
export function useProfile() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useProfile outside ProfileProvider')
  return c
}
