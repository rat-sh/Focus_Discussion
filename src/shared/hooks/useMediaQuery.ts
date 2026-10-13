import { useSyncExternalStore } from 'react'

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (cb) => { const m = window.matchMedia(query); m.addEventListener('change', cb); return () => m.removeEventListener('change', cb) },
    () => window.matchMedia(query).matches,
    () => false,
  )
}
/** Tailwind `md` breakpoint. Below it we render the phone layout. */
export const useIsDesktop = () => useMediaQuery('(min-width: 768px)')
