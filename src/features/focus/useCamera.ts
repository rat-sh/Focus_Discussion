import { useCallback, useEffect, useState } from 'react'

export type CameraStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'unavailable'

/** Opens the front camera. The stream stays on this device. It is never sent anywhere. */
export function useCamera(enabled: boolean) {
  const [result, setResult] = useState<{ attempt: number; status: Exclude<CameraStatus, 'idle' | 'requesting'>; stream?: MediaStream } | null>(null)
  const [attempt, setAttempt] = useState(0)
  const supported = Boolean(navigator.mediaDevices?.getUserMedia)
  const current = result?.attempt === attempt ? result : null
  const stream = enabled ? current?.stream ?? null : null
  const status: CameraStatus = !enabled ? 'idle' : !supported ? 'unavailable' : current?.status ?? 'requesting'

  useEffect(() => {
    if (!enabled || !navigator.mediaDevices?.getUserMedia) return
    let live = true
    let opened: MediaStream | null = null
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 480 }, height: { ideal: 640 } }, audio: false })
      .then((s) => { if (!live) { s.getTracks().forEach((t) => t.stop()); return } opened = s; setResult({ attempt, status: 'granted', stream: s }) })
      .catch((e: DOMException) => { if (live) setResult({ attempt, status: e.name === 'NotFoundError' ? 'unavailable' : 'denied' }) })
    return () => { live = false; opened?.getTracks().forEach((t) => t.stop()) }
  }, [enabled, attempt])

  const retry = useCallback(() => setAttempt((a) => a + 1), [])
  return { stream, status, retry }
}
