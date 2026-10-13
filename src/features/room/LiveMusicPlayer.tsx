import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type { Room } from 'livekit-client'
import { RoomEvent } from 'livekit-client'
import { decodeLivePlaybackState, encodeLivePlaybackState, LIVE_PLAYBACK_TOPIC, loadLivePlayback, saveLivePlayback, type LivePlaybackState, type LivePlaybackStateInput } from './liveApi'
import { Button } from '@/shared/ui/Button'
import { Input } from '@/shared/ui/Field'
import { YouTubeSearch } from './YouTubeSearch'

function parseYouTubeId(input: string): string | null {
  const value = input.trim()
  if (/^[A-Za-z0-9_-]{11}$/.test(value)) return value
  try {
    const url = new URL(value)
    const host = url.hostname.toLowerCase()
    if (host === 'youtu.be') {
      const id = url.pathname.split('/').filter(Boolean)[0]
      return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null
    }
    if (!['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com'].includes(host)) return null
    const id = url.searchParams.get('v') ?? url.pathname.match(/^\/(?:embed|shorts|live)\/([A-Za-z0-9_-]{11})/)?.[1]
    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null
  } catch {
    return null
  }
}

function currentPosition(state: LivePlaybackState, now: number): number {
  if (!state.isPlaying) return state.positionSeconds
  const elapsed = Math.max(0, (now - new Date(state.updatedAt).getTime()) / 1000)
  return Math.min(86400, state.positionSeconds + elapsed)
}

function formatTime(seconds: number): string {
  const total = Math.floor(seconds)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const remainder = total % 60
  return [hours, minutes, remainder].map((value, index) => index === 0 && value === 0 ? '' : String(value).padStart(2, '0')).filter(Boolean).join(':') || '0:00'
}

export function LiveMusicPlayer({ roomId, liveRoom, connected }: { roomId: string; liveRoom: Room | null; connected: boolean }) {
  const [state, setState] = useState<LivePlaybackState | null>(null)
  const [input, setInput] = useState('')
  const [seekPreview, setSeekPreview] = useState<number | null>(null)
  const [now, setNow] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const player = useRef<HTMLIFrameElement>(null)

  const refresh = useCallback(async () => {
    try {
      setState(await loadLivePlayback(roomId))
      setError(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load shared playback')
    }
  }, [roomId])

  useEffect(() => {
    const onData = (payload: Uint8Array, _participant: unknown, _kind: unknown, topic?: string) => {
      if (topic !== LIVE_PLAYBACK_TOPIC) return
      const next = decodeLivePlaybackState(payload)
      if (next) setState(next)
    }
    const onReconnect = () => { void refresh() }
    liveRoom?.on(RoomEvent.DataReceived, onData)
    liveRoom?.on(RoomEvent.Reconnected, onReconnect)
    const initialSync = window.setTimeout(() => { void refresh() }, 0)
    const clock = window.setInterval(() => setNow(Date.now()), 1000)
    return () => {
      window.clearTimeout(initialSync)
      window.clearInterval(clock)
      liveRoom?.off(RoomEvent.DataReceived, onData)
      liveRoom?.off(RoomEvent.Reconnected, onReconnect)
    }
  }, [liveRoom, refresh])

  const sendPlayerCommand = useCallback((func: 'playVideo' | 'pauseVideo' | 'seekTo', args: (number | boolean)[] = []) => {
    player.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func, args }),
      'https://www.youtube.com',
    )
  }, [])

  const videoId = state?.videoId
  const isPlaying = state?.isPlaying
  const positionSeconds = state?.positionSeconds
  const updatedAt = state?.updatedAt
  useEffect(() => {
    if (!videoId || isPlaying === undefined || positionSeconds === undefined || !updatedAt) return
    const elapsed = isPlaying ? Math.max(0, (Date.now() - new Date(updatedAt).getTime()) / 1000) : 0
    sendPlayerCommand('seekTo', [Math.floor(Math.min(86400, positionSeconds + elapsed)), true])
    sendPlayerCommand(isPlaying ? 'playVideo' : 'pauseVideo')
  }, [videoId, isPlaying, positionSeconds, updatedAt, sendPlayerCommand])

  const announce = async (next: LivePlaybackState) => {
    if (!liveRoom || liveRoom.state !== 'connected') {
      setError('Playback was saved. Other participants will sync after reconnect.')
      return
    }
    try {
      await liveRoom.localParticipant.publishData(new Uint8Array(encodeLivePlaybackState(next)), {
        reliable: true,
        topic: LIVE_PLAYBACK_TOPIC,
      })
    } catch {
      setError('Playback was saved, but live delivery failed. The room will resync after reconnect.')
    }
  }

  const saveState = async (next: LivePlaybackStateInput) => {
    const saved = await saveLivePlayback(roomId, next)
    setState(saved)
    setSeekPreview(null)
    setError(null)
    await announce(saved)
  }

  const addVideo = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const videoId = parseYouTubeId(input)
    if (!videoId) {
      setError('Enter a YouTube video URL or an 11-character video ID.')
      return
    }
    setBusy(true)
    try {
      await saveState({ videoId, isPlaying: false, positionSeconds: 0 })
      setInput('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not set the shared video')
    } finally {
      setBusy(false)
    }
  }

  const setVideoId = async (videoId: string) => {
    setBusy(true)
    try {
      await saveState({ videoId, isPlaying: false, positionSeconds: 0 })
    } finally {
      setBusy(false)
    }
  }

  const updatePlayback = async (patch: Partial<Pick<LivePlaybackStateInput, 'isPlaying' | 'positionSeconds'>>) => {
    if (!state) return
    setBusy(true)
    try {
      await saveState({
        videoId: state.videoId,
        isPlaying: patch.isPlaying ?? state.isPlaying,
        positionSeconds: patch.positionSeconds ?? currentPosition(state, Date.now()),
      })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update shared playback')
    } finally {
      setBusy(false)
    }
  }

  const position = state ? (seekPreview ?? currentPosition(state, now)) : 0
  const embedUrl = state
    ? `https://www.youtube.com/embed/${state.videoId}?enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}&controls=0&disablekb=1&playsinline=1&start=${Math.floor(currentPosition(state, now))}`
    : null

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
      <YouTubeSearch disabled={!connected || busy} onSelect={setVideoId} />
      <form className="flex shrink-0 gap-2" onSubmit={(event) => { void addVideo(event) }}>
        <Input value={input} onChange={(event) => setInput(event.target.value)} placeholder="YouTube URL or video ID" aria-label="YouTube URL or video ID" autoComplete="off" maxLength={2048} />
        <Button type="submit" variant="primary" disabled={!connected || busy || !input.trim()}>Set video</Button>
      </form>
      {!connected && <p className="text-xs text-muted">Reconnect to change or sync the shared video.</p>}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      {state && embedUrl ? (
        <>
          <div className="relative aspect-video w-full overflow-hidden rounded-ui bg-black">
            <iframe
              key={state.videoId}
              ref={player}
              src={embedUrl}
              title="Shared YouTube video"
              className="absolute inset-0 h-full w-full"
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              onLoad={() => {
                sendPlayerCommand('seekTo', [Math.floor(currentPosition(state, Date.now())), true])
                sendPlayerCommand(state.isPlaying ? 'playVideo' : 'pauseVideo')
              }}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3 rounded-ui border border-line bg-surface p-3">
            <Button variant="primary" disabled={!connected || busy} onClick={() => void updatePlayback({ isPlaying: !state.isPlaying })}>{state.isPlaying ? 'Pause for everyone' : 'Play for everyone'}</Button>
            <Button variant="secondary" disabled={!connected} onClick={() => sendPlayerCommand(state.isPlaying ? 'playVideo' : 'pauseVideo')}>Sync player here</Button>
            <label className="flex min-w-48 flex-1 items-center gap-2 text-xs text-muted">
              <span>{formatTime(position)}</span>
              <input
                type="range"
                min={0}
                max={86400}
                step={1}
                value={Math.floor(position)}
                aria-label="Shared video position"
                className="min-w-0 flex-1 accent-accent"
                disabled={!connected || busy}
                onChange={(event) => setSeekPreview(Number(event.target.value))}
                onPointerUp={(event) => { void updatePlayback({ positionSeconds: Number(event.currentTarget.value) }) }}
                onKeyUp={(event) => {
                  if (event.key.startsWith('Arrow')) void updatePlayback({ positionSeconds: Number(event.currentTarget.value) })
                }}
              />
            </label>
            <p className="w-full text-xs text-muted">Last controlled by {state.controllerName}</p>
            <p className="w-full text-xs text-muted">If playback is blocked by browser autoplay settings, use Sync player here.</p>
          </div>
        </>
      ) : (
        <div className="flex min-h-48 flex-1 items-center justify-center rounded-ui border border-dashed border-line bg-surface text-center text-sm text-muted">
          Add a YouTube video to start shared playback.
        </div>
      )}
    </div>
  )
}
