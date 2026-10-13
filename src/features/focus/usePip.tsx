import { useCallback, useEffect, useState } from 'react'

interface PipApi { requestWindow(o?: { width?: number; height?: number }): Promise<Window> }
const api = () => (window as unknown as { documentPictureInPicture?: PipApi }).documentPictureInPicture

/** Floating always-on-top window (desktop Chromium-class browsers only). Keeps the camera tile visible over other tabs. */
export function usePip() {
  const [win, setWin] = useState<Window | null>(null)
  const supported = typeof window !== 'undefined' && !!api()

  const open = useCallback(async () => {
    const pip = api()
    if (!pip) return
    const w = await pip.requestWindow({ width: 190, height: 250 })
    document.head.querySelectorAll('link[rel="stylesheet"], style').forEach((n) => w.document.head.appendChild(n.cloneNode(true)))
    w.document.documentElement.dataset.theme = document.documentElement.dataset.theme
    w.document.body.style.margin = '0'
    w.addEventListener('pagehide', () => setWin(null))
    setWin(w)
  }, [])
  const close = useCallback(() => { win?.close(); setWin(null) }, [win])
  useEffect(() => () => { win?.close() }, [win])
  return { supported, win, isOpen: !!win, open, close }
}
