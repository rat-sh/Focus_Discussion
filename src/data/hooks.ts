import { useCallback, useEffect, useRef, useState } from 'react'

export interface Resource<T> {
  data: T | undefined
  loading: boolean
  error: Error | null
  reload: () => Promise<void>
  setData: (updater: (prev: T | undefined) => T | undefined) => void
}

/** Minimal async-data hook. Mirrors what a Supabase-backed query hook will expose. */
export function useResource<T>(fetcher: () => Promise<T>, resourceKey?: unknown): Resource<T> {
  const [data, setDataState] = useState<T | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const ticket = useRef(0)
  const fetchRef = useRef(fetcher)

  const run = useCallback(async () => {
    const mine = ++ticket.current
    setLoading(true)
    try {
      const result = await fetchRef.current()
      if (mine === ticket.current) { setDataState(result); setError(null) }
    } catch (e) {
      if (mine === ticket.current) setError(e instanceof Error ? e : new Error(String(e)))
    } finally {
      if (mine === ticket.current) setLoading(false)
    }
  }, [])

  useEffect(() => { fetchRef.current = fetcher }, [fetcher])
  useEffect(() => { void Promise.resolve().then(run) }, [resourceKey, run])
  return { data, loading, error, reload: run, setData: (u) => setDataState((p) => u(p)) }
}
