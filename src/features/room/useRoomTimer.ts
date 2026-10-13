import { useCallback, useEffect, useState } from 'react'

/** Shared Pomodoro. Local countdown for now; becomes a server-owned timer (see docs/DATA_CONTRACT.md). */
export function useRoomTimer(minutes = 25) {
  const [left, setLeft] = useState(minutes * 60)
  const [running, setRunning] = useState(true)
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setLeft((l) => (l <= 1 ? minutes * 60 : l - 1)), 1000)
    return () => clearInterval(id)
  }, [running, minutes])
  const toggle = useCallback(() => setRunning((r) => !r), [])
  return { left, running, toggle }
}
