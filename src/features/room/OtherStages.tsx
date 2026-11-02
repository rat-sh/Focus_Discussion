import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type { Room } from 'livekit-client'
import { RoomEvent } from 'livekit-client'
import { Presentation } from 'lucide-react'
import { repos } from '@/data'
import { useResource } from '@/data/hooks'
import type { FocusLink } from '@/domain/types'
import { Async, EmptyState } from '@/shared/ui/Feedback'
import { Button } from '@/shared/ui/Button'
import { Input } from '@/shared/ui/Field'
import { cx } from '@/shared/lib/cx'
import { focusKindOf } from '@/shared/lib/format'
import { safeHttpUrl } from '@/shared/lib/safeUrl'
import { noEmbedReason, resolveStudyEmbed } from '@/shared/lib/studyEmbed'
import {
  decodeLiveStageState,
  encodeLiveStageState,
  LIVE_STAGE_TOPIC,
  loadLiveStage,
  saveLiveStage,
  type LiveStageState,
  type LiveStageStateInput,
} from './liveApi'
import { LinkViewer } from '../focus/LinkViewer'

function validStageUrl(value: string): URL | null {
  const url = safeHttpUrl(value)
  return url?.protocol === 'https:' ? url : null
}

function stageKind(url: URL): LiveStageStateInput['kind'] {
  return resolveStudyEmbed(url)?.kind ?? 'other'
}

function detectedType(url: URL | null): string {
  if (!url) return 'Enter a safe HTTPS link.'
  const embed = resolveStudyEmbed(url)
  if (embed?.kind === 'youtube-video') return 'Detected: video'
  if (embed?.kind === 'youtube-playlist') return 'Detected: playlist'
  if (embed?.kind === 'youtube-channel') return 'Detected: channel'
  const reason = noEmbedReason(url)
  if (reason === 'pdf') return 'Detected: other — PDF opens in a new tab.'
  if (reason === 'youtube-channel-page') return 'Detected: other — this channel page cannot be embedded.'
  return 'Detected: other — the link will open in a new tab.'
}

/** Shows the room's canonical Study item, synchronized through storage and LiveKit. */
export function MaterialStage({
  roomId,
  liveRoom,
  onShareScreen,
  onStageChange,
}: {
  roomId?: string
  liveRoom?: Room | null
  onShareScreen?: () => void
  onStageChange?: () => void
} = {}) {
  const res = useResource(() => repos.materials.list(roomId), roomId)
  const [id, setId] = useState<string | null>(null)
  const [stage, setStage] = useState<LiveStageState | null>(null)
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const candidate = validStageUrl(input.trim())

  const refresh = useCallback(async () => {
    if (!roomId) return
    try {
      const current = await loadLiveStage(roomId)
      setStage(current)
      setError(null)
      if (current) onStageChange?.()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load the room Study stage')
    }
  }, [roomId, onStageChange])

  useEffect(() => {
    if (!roomId) return
    const onData = (payload: Uint8Array, _participant: unknown, _kind: unknown, topic?: string) => {
      if (topic !== LIVE_STAGE_TOPIC) return
      const next = decodeLiveStageState(payload)
      if (!next) return
      setStage(next)
      setError(null)
      onStageChange?.()
    }
    const onReconnect = () => { void refresh() }
    liveRoom?.on(RoomEvent.DataReceived, onData)
    liveRoom?.on(RoomEvent.Reconnected, onReconnect)
    const initialSync = window.setTimeout(() => { void refresh() }, 0)
    return () => {
      window.clearTimeout(initialSync)
      liveRoom?.off(RoomEvent.DataReceived, onData)
      liveRoom?.off(RoomEvent.Reconnected, onReconnect)
    }
  }, [roomId, liveRoom, refresh, onStageChange])

  const showToEveryone = async (url: string, title: string) => {
    if (!roomId) return
    const safeUrl = validStageUrl(url)
    if (!safeUrl) {
      setError('Use a valid HTTPS URL without a username or password.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const saved = await saveLiveStage(roomId, {
        url: safeUrl.href,
        title: title.trim().slice(0, 120) || safeUrl.hostname,
        kind: stageKind(safeUrl),
      })
      setStage(saved)
      onStageChange?.()
      if (!liveRoom || liveRoom.state !== 'connected') {
        setError('Study item saved. Other participants will sync when they reconnect.')
        return
      }
      try {
        await liveRoom.localParticipant.publishData(new Uint8Array(encodeLiveStageState(saved)), {
          reliable: true,
          topic: LIVE_STAGE_TOPIC,
        })
      } catch {
        setError('Study item saved, but live delivery failed. The room will resync after reconnect.')
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not share this Study item')
    } finally {
      setBusy(false)
    }
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!candidate) {
      setError('Enter a valid HTTPS URL without a username or password.')
      return
    }
    void showToEveryone(candidate.href, candidate.hostname)
  }

  return (
    <Async res={res}>
      {(all) => {
        const list = all.filter((material) => material.scope === 'room' || (!roomId && material.kind === 'practice'))
        const selectedMaterial = list.find((material) => material.id === id) ?? list[0]
        const currentUrl = roomId ? stage?.url : selectedMaterial?.url
        const currentTitle = roomId ? stage?.title : selectedMaterial?.title
        const currentHost = currentUrl ? validStageUrl(currentUrl)?.host ?? '' : ''
        const currentLink: FocusLink | null = currentUrl && currentTitle
          ? {
              id: roomId ? stage?.updatedAt ?? currentUrl : selectedMaterial?.id ?? currentUrl,
              kind: roomId ? 'material' : focusKindOf(selectedMaterial?.kind ?? 'practice'),
              label: currentTitle,
              url: currentUrl,
              host: currentHost,
            }
          : null
        const shownMaterialId = roomId
          ? list.find((material) => material.url === stage?.url && material.title === stage.title)?.id
          : selectedMaterial?.id

        return (
          <div className="flex h-full min-h-0 flex-col">
            {roomId && (
              <section className="shrink-0 space-y-2 border-b border-line bg-surface p-3">
                <form className="flex gap-2" onSubmit={submit}>
                  <Input
                    aria-label="Paste a link"
                    placeholder="Paste a link"
                    value={input}
                    onChange={(event) => { setInput(event.currentTarget.value); setError(null) }}
                    maxLength={2048}
                  />
                  <Button variant="primary" type="submit" disabled={!candidate || busy}>
                    {busy ? 'Sharing…' : 'Show to everyone'}
                  </Button>
                </form>
                <p className="text-xs text-muted" role="status">{detectedType(candidate)}</p>
                {error && <p className="text-xs text-danger" role="alert">{error}</p>}
                {stage && <p className="text-xs text-muted">Shown by <span className="font-medium text-fg">{stage.controllerName}</span></p>}
              </section>
            )}
            <div className="flex min-h-0 flex-1 flex-col md:flex-row">
              <ul className="no-scrollbar flex shrink-0 gap-1 overflow-x-auto border-b border-line p-2 md:w-56 md:flex-col md:overflow-y-auto md:border-b-0 md:border-r">
                {list.map((material) => (
                  <li key={material.id} className="shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        if (roomId) void showToEveryone(material.url, material.title)
                        else setId(material.id)
                      }}
                      aria-current={material.id === shownMaterialId ? 'true' : undefined}
                      className={cx('block min-h-11 w-full max-w-56 truncate rounded-ui px-3 text-left text-sm md:min-h-9', material.id === shownMaterialId ? 'bg-raised font-medium' : 'text-muted hover:text-fg')}
                    >
                      {material.title}
                    </button>
                  </li>
                ))}
              </ul>
              <div className="min-h-0 flex-1">
                {currentLink
                  ? <LinkViewer link={currentLink} onShareScreen={onShareScreen} />
                  : roomId
                    ? <EmptyState icon={Presentation} title="Choose a Study item" text="Paste a link above or choose a saved room material to show it to everyone." />
                    : <EmptyState icon={Presentation} title="No material shared" text="Any room member can share a PDF or link with this room from Study materials." />}
              </div>
            </div>
          </div>
        )
      }}
    </Async>
  )
}
