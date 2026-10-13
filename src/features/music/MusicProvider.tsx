import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useRegisterCommands, type Command } from '@/shared/context/command'
import { useToast } from '@/shared/ui/Toast'
import { isValidUrl, normalizeUrl } from '@/shared/lib/format'
import { safeHttpUrl, isValidYouTubeId } from '@/shared/lib/safeUrl'
import { usePrefs } from '../settings/prefs'

export const QUICK_PICKS = [
  { id: 'lofi', label: 'Lo-fi beats', query: 'lofi study beats' },
  { id: 'rain', label: 'Rain sounds', query: 'rain sounds for studying' },
  { id: 'brown', label: 'Brown noise', query: 'brown noise focus' },
  { id: 'piano', label: 'Instrumental piano', query: 'instrumental piano study' },
  { id: 'deep', label: 'Deep focus', query: 'deep focus music' },
] as const
export const searchUrl = (query: string) => `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`

/** Turns a pasted link into an embeddable audio source. Only YouTube links are supported for now. */
export function toEmbed(raw: string): string | null {
  const url = normalizeUrl(raw)
  if (!isValidUrl(url)) return null

  // Validate through safeHttpUrl
  const safe = safeHttpUrl(url)
  if (!safe) return null

  // Reject same-origin URLs (sandbox escape risk with allow-scripts + allow-same-origin)
  if (typeof window !== 'undefined' && safe.origin === window.location.origin) return null

  const host = safe.hostname.replace(/^www\./, '')
  let id: string | null = null
  if (host === 'youtu.be') id = safe.pathname.slice(1)
  else if (host.endsWith('youtube.com')) id = safe.searchParams.get('v') ?? (safe.pathname.startsWith('/embed/') ? safe.pathname.split('/')[2] : null)

  // Validate YouTube video ID
  if (id && !isValidYouTubeId(id)) id = null

  const list = safe.searchParams.get('list')
  // Validate playlist ID (alphanumeric, hyphens, underscores)
  const safeList = list && /^[\w-]+$/.test(list) ? list : null

  if (!id && !safeList) return null
  const base = id ? `https://www.youtube-nocookie.com/embed/${id}` : 'https://www.youtube-nocookie.com/embed/videoseries'
  return `${base}?enablejsapi=1&autoplay=1&loop=1&playsinline=1${safeList ? `&list=${safeList}` : ''}`
}

interface Value { src: string | null; source: string; playing: boolean; volume: number; play: (link: string) => boolean; toggle: () => void; stop: () => void; setVolume: (v: number) => void }
const Ctx = createContext<Value | null>(null)

/** One hidden player for the whole app, so music keeps playing while you move between screens. */
export function MusicProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = usePrefs()
  const toast = useToast()
  const [src, setSrc] = useState<string | null>(null)
  const [source, setSource] = useState('')
  const [playing, setPlaying] = useState(false)
  const frame = useRef<HTMLIFrameElement>(null)
  const post = useCallback((func: string, args: unknown[] = []) => {
    frame.current?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args }), '*')
  }, [])

  const play = useCallback((link: string) => {
    const e = toEmbed(link)
    if (!e) { toast('Paste a YouTube link to play music', 'error'); return false }
    setSrc(e); setSource(link); setPlaying(true)
    return true
  }, [toast])
  const toggle = useCallback(() => { setPlaying((p) => { post(p ? 'pauseVideo' : 'playVideo'); return !p }) }, [post])
  const stop = useCallback(() => { setSrc(null); setSource(''); setPlaying(false) }, [])
  const setVolume = useCallback((v: number) => { setPrefs((p) => ({ ...p, musicVolume: v })); post('setVolume', [v]) }, [post, setPrefs])

  const musicCommands = useMemo<Command[]>(() => [
    { id: 'music-play', label: 'Play music from a link', hint: 'paste a YouTube link', slash: 'music', run: (arg) => { if (arg === 'stop') stop(); else if (arg) play(arg); else toast('Usage: /music <youtube link>') } },
    { id: 'music-stop', label: 'Stop music', slash: 'stop', run: stop },
  ], [play, stop, toast])
  useRegisterCommands('music', musicCommands)
  useEffect(() => { if (src) { const t = setTimeout(() => post('setVolume', [prefs.musicVolume]), 1200); return () => clearTimeout(t) } }, [src, prefs.musicVolume, post])

  const value = useMemo(() => ({ src, source, playing, volume: prefs.musicVolume, play, toggle, stop, setVolume }), [src, source, playing, prefs.musicVolume, play, toggle, stop, setVolume])
  return (
    <Ctx.Provider value={value}>
      {children}
      {/*
       * sandbox flags:
       * - allow-scripts: needed for YouTube IFrame API / postMessage to work
       * - allow-same-origin: needed for YouTube's API to communicate with the parent
       * - allow-presentation: needed for media playback features
       */}
      {src && <iframe ref={frame} title="Study music player" src={src} sandbox="allow-scripts allow-same-origin allow-presentation" allow="autoplay; encrypted-media" className="pointer-events-none fixed -left-[9999px] h-px w-px opacity-0" />}
    </Ctx.Provider>
  )
}
export function useMusic() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useMusic outside MusicProvider')
  return c
}
