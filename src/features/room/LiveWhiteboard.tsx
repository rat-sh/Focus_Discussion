import { useCallback, useEffect, useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import type { Room } from 'livekit-client'
import { RoomEvent } from 'livekit-client'
import { Download, RefreshCw, RotateCcw, Trash2 } from 'lucide-react'
import { addLiveWhiteboardStroke, clearLiveWhiteboard, decodeLiveBoardEvent, encodeLiveBoardEvent, LIVE_BOARD_TOPIC, loadLiveWhiteboard, undoLiveWhiteboard, type LiveWhiteboardEvent, type LiveWhiteboardStroke, type LiveWhiteboardStrokeInput } from './liveApi'
import { downloadWhiteboardSvg } from './exportWhiteboard'
import { Button } from '@/shared/ui/Button'

const COLORS = [
  { value: '#202124', label: 'Black' },
  { value: '#d93025', label: 'Red' },
  { value: '#1a73e8', label: 'Blue' },
  { value: '#188038', label: 'Green' },
  { value: '#f9ab00', label: 'Orange' },
] as const
const WIDTHS = [2, 4, 8, 12] as const

interface DraftStroke {
  color: string
  width: typeof WIDTHS[number]
  points: Array<{ x: number; y: number }>
}

export function LiveWhiteboard({
  roomId,
  liveRoom,
  connected,
  userId,
}: {
  roomId: string
  liveRoom: Room | null
  connected: boolean
  userId: string
}) {
  const [strokes, setStrokes] = useState<LiveWhiteboardStroke[]>([])
  const [draft, setDraft] = useState<DraftStroke | null>(null)
  const [color, setColor] = useState<string>(COLORS[0].value)
  const [width, setWidth] = useState<typeof WIDTHS[number]>(4)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const requestId = useRef(0)
  const draftRef = useRef<DraftStroke | null>(null)

  const refresh = useCallback(async () => {
    const id = ++requestId.current
    try {
      const items = await loadLiveWhiteboard(roomId)
      if (requestId.current === id) {
        setStrokes(items)
        setError(null)
      }
    } catch (cause) {
      if (requestId.current === id) setError(cause instanceof Error ? cause.message : 'Could not load the shared board')
    }
  }, [roomId])

  useEffect(() => {
    const onData = (payload: Uint8Array, _participant: unknown, _kind: unknown, topic?: string) => {
      if (topic !== LIVE_BOARD_TOPIC) return
      const event = decodeLiveBoardEvent(payload)
      if (!event) return
      requestId.current += 1
      if (event.type === 'stroke') {
        setStrokes((items) => items.some((stroke) => stroke.id === event.stroke.id)
          ? items
          : [...items, event.stroke].sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id)))
      } else if (event.type === 'clear') {
        setStrokes([])
      } else {
        setStrokes((items) => items.filter((stroke) => stroke.id !== event.strokeId))
      }
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
  }, [liveRoom, refresh])

  const announceChange = async (event: LiveWhiteboardEvent) => {
    if (!liveRoom || liveRoom.state !== 'connected') {
      setError('The change was saved. Other participants will see it after reconnect.')
      return
    }
    try {
      await liveRoom.localParticipant.publishData(new Uint8Array(encodeLiveBoardEvent(event)), {
        reliable: true,
        topic: LIVE_BOARD_TOPIC,
      })
    } catch {
      setError('The change was saved, but live delivery failed. Other participants will see it after reconnect.')
    }
  }

  const getPoint = (event: PointerEvent<SVGSVGElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect()
    return {
      x: Math.max(0, Math.min(1000, ((event.clientX - bounds.left) / bounds.width) * 1000)),
      y: Math.max(0, Math.min(600, ((event.clientY - bounds.top) / bounds.height) * 600)),
    }
  }

  const beginStroke = (event: PointerEvent<SVGSVGElement>) => {
    if (!connected || busy || event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    const stroke: DraftStroke = { color, width, points: [getPoint(event)] }
    draftRef.current = stroke
    setDraft(stroke)
  }

  const moveStroke = (event: PointerEvent<SVGSVGElement>) => {
    const current = draftRef.current
    if (!current) return
    const next = { ...current, points: [...current.points, getPoint(event)] }
    draftRef.current = next
    setDraft(next)
  }

  const finishStroke = async (event: PointerEvent<SVGSVGElement>) => {
    const current = draftRef.current
    if (!current) return
    const stroke: LiveWhiteboardStrokeInput = { ...current, points: [...current.points, getPoint(event)] }
    draftRef.current = null
    setDraft(null)
    if (stroke.points.length < 2) return

    setBusy(true)
    try {
      const saved = await addLiveWhiteboardStroke(roomId, stroke)
      setStrokes((items) => [...items, saved])
      setError(null)
      await announceChange({ type: 'stroke', stroke: saved })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save the whiteboard stroke')
    } finally {
      setBusy(false)
    }
  }

  const clear = async () => {
    setBusy(true)
    try {
      await clearLiveWhiteboard(roomId)
      setStrokes([])
      setError(null)
      await announceChange({ type: 'clear' })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not clear the shared board')
    } finally {
      setBusy(false)
    }
  }

  const undo = async () => {
    setBusy(true)
    try {
      const strokeId = await undoLiveWhiteboard(roomId)
      setError(null)
      if (strokeId) {
        setStrokes((items) => items.filter((stroke) => stroke.id !== strokeId))
        await announceChange({ type: 'undo', strokeId })
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not undo your last stroke')
    } finally {
      setBusy(false)
    }
  }

  const canUndo = strokes.some((stroke) => stroke.userId === userId)

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex shrink-0 flex-wrap items-center gap-2 rounded-ui border border-line bg-surface p-2">
        <div className="flex items-center gap-1.5" role="group" aria-label="Stroke color">
          {COLORS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              aria-label={`Choose ${label} stroke color`}
              aria-pressed={color === value}
              onClick={() => setColor(value)}
              className={`h-8 w-8 rounded-full border-2 border-white transition-transform hover:scale-110 ${color === value ? 'ring-2 ring-accent ring-offset-2 ring-offset-surface' : 'ring-1 ring-line'}`}
              style={{ backgroundColor: value }}
            />
          ))}
          <label className="relative ml-1 flex h-8 w-8 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-line bg-raised text-xs font-semibold text-fg ring-1 ring-line" title="Choose a custom color">
            <span aria-hidden>+</span>
            <input
              type="color"
              aria-label="Choose custom stroke color"
              value={color}
              onChange={(event) => setColor(event.target.value)}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
          </label>
        </div>
        <label className="flex items-center gap-2 text-xs text-muted">
          Width
          <select aria-label="Stroke width" value={width} onChange={(event) => setWidth(Number(event.target.value) as typeof width)} className="rounded-ui border border-line bg-canvas px-2 py-1 text-ink">
            {WIDTHS.map((value) => <option key={value} value={value}>{value}px</option>)}
          </select>
        </label>
        <div className="ml-auto flex gap-1.5">
          <Button size="sm" variant="secondary" icon={Download} onClick={() => downloadWhiteboardSvg(roomId, strokes)} disabled={strokes.length === 0}>Download</Button>
          <Button size="sm" variant="secondary" icon={RotateCcw} onClick={() => void undo()} disabled={!connected || busy || !canUndo}>Undo mine</Button>
          <Button size="sm" variant="secondary" icon={Trash2} onClick={() => void clear()} disabled={!connected || busy || strokes.length === 0}>Clear</Button>
        </div>
      </div>
      {!connected && <p role="status" className="rounded-ui border border-line bg-raised px-3 py-2 text-xs text-muted">Reconnecting to server… The shared board is read-only until the room connection is restored.</p>}
      {error && (
        <div role="alert" className="flex flex-wrap items-center gap-2 rounded-ui border border-danger/30 bg-danger/5 px-3 py-2 text-xs text-danger">
          <p className="min-w-0 flex-1">{error}</p>
          <Button size="sm" variant="secondary" icon={RefreshCw} onClick={() => void refresh()}>Retry</Button>
        </div>
      )}
      <svg
        viewBox="0 0 1000 600"
        preserveAspectRatio="none"
        role="img"
        aria-label="Shared whiteboard"
        className={`min-h-0 flex-1 touch-none rounded-ui border border-line bg-white ${connected ? 'cursor-crosshair' : 'cursor-not-allowed opacity-80'}`}
        onPointerDown={beginStroke}
        onPointerMove={moveStroke}
        onPointerUp={(event) => { void finishStroke(event) }}
        onPointerCancel={() => { draftRef.current = null; setDraft(null) }}
      >
        <defs>
          <pattern id="studyroom-board-grid" width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#e5e7eb" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="1000" height="600" fill="url(#studyroom-board-grid)" />
        {strokes.map((stroke) => (
          <polyline
            key={stroke.id}
            points={stroke.points.map((point) => `${point.x},${point.y}`).join(' ')}
            fill="none"
            stroke={stroke.color}
            strokeWidth={stroke.width}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {draft && (
          <polyline
            points={draft.points.map((point) => `${point.x},${point.y}`).join(' ')}
            fill="none"
            stroke={draft.color}
            strokeWidth={draft.width}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>
    </div>
  )
}
