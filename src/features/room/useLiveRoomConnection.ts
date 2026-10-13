import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Room } from 'livekit-client'
import { repos } from '@/data'
import { decodeLiveChat, encodeLiveChat, LIVE_CHAT_TOPIC, loadLiveChat, requestLiveKitToken, sendLiveChat, type LiveChatMessage } from './liveApi'
import type { TileParticipant } from './ParticipantTile'
import { participantTile } from './liveRoomParticipants'
import { decodeHandPacket, encodeHandPacket, LIVE_HAND_TOPIC } from './liveRoomSync'

interface Options {
  code: string
  initialMic: boolean | undefined
  initialCam: boolean | undefined
  userId: string | undefined
  runSlash: (text: string) => boolean
}

function normalizeRoomConnectionError(cause: unknown) {
  const message = cause instanceof Error ? cause.message : String(cause ?? 'Could not connect to the video room')
  const lower = message.toLowerCase()

  if (lower.includes('invalid token') || lower.includes('token expired') || lower.includes('token is invalid') || lower.includes('not authorized') || lower.includes('room join')) {
    return 'Your video session expired or was rejected. Refreshing the room connection…'
  }
  if (lower.includes('fetch') || lower.includes('network') || lower.includes('failed to fetch')) {
    return 'Could not reach the video service. Check your connection and retry.'
  }
  return 'The room connection is unstable. Refreshing the live session…'
}

export function useLiveRoomConnection({ code, initialMic, initialCam, userId, runSlash }: Options) {
  const roomRef = useRef<Room | null>(null)
  const handAtRef = useRef<string | null>(null)
  const [liveRoom, setLiveRoom] = useState<Room | null>(null)
  const [roomId, setRoomId] = useState<string | null>(null)
  const [roomName, setRoomName] = useState(code)
  const [participants, setParticipants] = useState<TileParticipant[]>([])
  const [raisedHands, setRaisedHands] = useState<Record<string, string>>({})
  const [messages, setMessages] = useState<LiveChatMessage[]>([])
  const [chatError, setChatError] = useState<string | null>(null)
  const [hand, setHand] = useState(false)
  const [mic, setMic] = useState(initialMic ?? false)
  const [cam, setCam] = useState(initialCam ?? false)
  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(true)
  const [connectionFailed, setConnectionFailed] = useState(false)
  const [connectionAttempt, setConnectionAttempt] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [audioBlocked, setAudioBlocked] = useState(false)
  const visibleParticipants = useMemo(
    () => {
      const queue = Object.entries(raisedHands)
        .sort(([leftId, leftAt], [rightId, rightAt]) => leftAt.localeCompare(rightAt) || leftId.localeCompare(rightId))
      const order = new Map(queue.map(([id], index) => [id, index + 1]))
      return participants.map((participant) => ({ ...participant, handOrder: order.get(participant.id) ?? null }))
    },
    [participants, raisedHands],
  )

  const toggleHand = useCallback(() => {
    const room = roomRef.current
    if (!room || room.state !== 'connected') return
    const next = !hand
    const at = next ? new Date().toISOString() : null
    setHand(next)
    handAtRef.current = at
    setRaisedHands((current) => {
      const updated = { ...current }
      if (!userId) return current
      if (at) updated[userId] = at
      else delete updated[userId]
      return updated
    })
    const packet = at ? { type: 'raised' as const, at } : { type: 'lowered' as const }
    void room.localParticipant.publishData(new Uint8Array(encodeHandPacket(packet)), { reliable: true, topic: LIVE_HAND_TOPIC })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Could not update raised hand status'))
  }, [hand, userId])

  const mergeMessages = useCallback((incoming: LiveChatMessage[]) => {
    setMessages((current) => {
      const byId = new Map(current.map((message) => [message.id, message]))
      for (const message of incoming) byId.set(message.id, message)
      return [...byId.values()]
        .sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id))
        .slice(-100)
    })
  }, [])

  useEffect(() => {
    let cancelled = false
    let room: Room | null = null
    const connect = async () => {
      setConnecting(true)
      setConnectionFailed(false)
      setError(null)
      try {
        const rooms = await repos.rooms.listMine()
        const membership = rooms.find((item) => item.code.toUpperCase() === code.toUpperCase())
        if (!membership) throw new Error('You are not a member of this room. Join it before connecting.')
        if (cancelled) return
        setRoomName(membership.name)
        setRoomId(membership.id)
        const credentials = await requestLiveKitToken(membership.id)
        if (cancelled) return

        const { Room: LiveKitRoom, RoomEvent, Track } = await import('livekit-client')
        if (cancelled) return
        room = new LiveKitRoom({ adaptiveStream: true, dynacast: true })
        roomRef.current = room
        setLiveRoom(room)
        const refreshParticipants = () => {
          if (!room) return
          const current = [
            participantTile(room.localParticipant, Track.Source.Camera, Track.Source.Microphone),
            ...[...room.remoteParticipants.values()].map((participant) =>
              participantTile(participant, Track.Source.Camera, Track.Source.Microphone)),
          ]
          setParticipants(current)
        }
        const requestRaisedHands = () => {
          if (!room || room.state !== 'connected') return
          void room.localParticipant.publishData(new Uint8Array(encodeHandPacket({ type: 'request' })), { reliable: true, topic: LIVE_HAND_TOPIC })
            .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Could not sync raised hands'))
        }
        room
          .on(RoomEvent.ParticipantConnected, refreshParticipants)
          .on(RoomEvent.ParticipantDisconnected, (participant) => {
            setRaisedHands((current) => {
              const updated = { ...current }
              delete updated[participant.identity]
              return updated
            })
            refreshParticipants()
          })
          .on(RoomEvent.ConnectionStateChanged, () => {
            const nextConnected = room?.state === 'connected'
            setConnected(nextConnected)
            if (nextConnected) setError(null)
          })
          .on(RoomEvent.TrackPublished, refreshParticipants)
          .on(RoomEvent.TrackUnpublished, refreshParticipants)
          .on(RoomEvent.TrackSubscribed, refreshParticipants)
          .on(RoomEvent.TrackUnsubscribed, refreshParticipants)
          .on(RoomEvent.TrackMuted, refreshParticipants)
          .on(RoomEvent.TrackUnmuted, refreshParticipants)
          .on(RoomEvent.ActiveSpeakersChanged, refreshParticipants)
          .on(RoomEvent.DataReceived, (payload, sender, _kind, topic) => {
            if (topic === LIVE_CHAT_TOPIC) {
              const message = decodeLiveChat(payload)
              if (message) mergeMessages([message])
              return
            }
            if (topic !== LIVE_HAND_TOPIC) return
            const packet = decodeHandPacket(payload)
            if (!packet) return
            if (packet.type === 'request') {
              const raisedAt = handAtRef.current
              if (raisedAt) {
                void room?.localParticipant.publishData(new Uint8Array(encodeHandPacket({ type: 'raised', at: raisedAt })), { reliable: true, topic: LIVE_HAND_TOPIC })
                  .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Could not sync raised hand status'))
              }
              return
            }
            if (!sender) return
            setRaisedHands((current) => {
              const updated = { ...current }
              if (packet.type === 'raised') updated[sender.identity] = packet.at
              else delete updated[sender.identity]
              return updated
            })
          })
          .on(RoomEvent.Reconnected, () => {
            setConnected(true)
            setError(null)
            refreshParticipants()
            requestRaisedHands()
          })
          .on(RoomEvent.Disconnected, () => setConnected(false))
        await room.connect(credentials.url, credentials.token)
        if (cancelled) {
          room.disconnect()
          return
        }
        setConnected(true)
        setConnectionFailed(false)
        refreshParticipants()
        requestRaisedHands()
        await room.localParticipant.setMicrophoneEnabled(initialMic ?? false)
        await room.localParticipant.setCameraEnabled(initialCam ?? false)
        refreshParticipants()
        try {
          await room.startAudio()
        } catch {
          setAudioBlocked(true)
        }
      } catch (cause) {
        if (!cancelled) {
          const friendlyMessage = normalizeRoomConnectionError(cause)
          setError(friendlyMessage)
          setConnectionFailed(true)
        }
      } finally {
        if (!cancelled) setConnecting(false)
      }
    }
    void connect()
    return () => {
      cancelled = true
      roomRef.current?.disconnect()
      roomRef.current = null
    }
  }, [code, connectionAttempt, initialCam, initialMic, mergeMessages, userId])

  useEffect(() => {
    if (!connectionFailed) return
    const retryDelayMs = Math.min(15000, 1200 + connectionAttempt * 2000)
    const timer = window.setTimeout(() => {
      setConnectionAttempt((attempt) => attempt + 1)
      setConnectionFailed(false)
      setError(null)
    }, retryDelayMs)
    return () => window.clearTimeout(timer)
  }, [connectionAttempt, connectionFailed])

  useEffect(() => {
    if (!roomId || !liveRoom) return
    let cancelled = false
    let unsubscribe: (() => void) | undefined
    const syncChat = async () => {
      try {
        const history = await loadLiveChat(roomId)
        if (!cancelled) {
          mergeMessages(history)
          setChatError(null)
        }
      } catch (cause) {
        if (!cancelled) setChatError(cause instanceof Error ? cause.message : 'Could not refresh room chat')
      }
    }
    void import('livekit-client').then(({ RoomEvent }) => {
      if (cancelled) return
      liveRoom.on(RoomEvent.Reconnected, syncChat)
      unsubscribe = () => liveRoom.off(RoomEvent.Reconnected, syncChat)
    }).catch((cause: unknown) => {
      if (!cancelled) setChatError(cause instanceof Error ? cause.message : 'Could not load live room events')
    })
    void syncChat()
    return () => {
      cancelled = true
      unsubscribe?.()
    }
  }, [roomId, liveRoom, mergeMessages])

  const postChat = async (text: string) => {
    if (text.startsWith('/') && runSlash(text)) return
    if (!roomId) throw new Error('Room membership is not ready')
    const message = await sendLiveChat(roomId, text)
    mergeMessages([message])
    const room = roomRef.current
    if (!room || room.state !== 'connected') {
      setChatError('Message saved. Live delivery will resume when the room reconnects.')
      return
    }
    try {
      await room.localParticipant.publishData(new Uint8Array(encodeLiveChat(message)), { reliable: true, topic: LIVE_CHAT_TOPIC })
    } catch {
      setChatError('Message saved, but live delivery failed. It will appear for others after reconnect.')
    }
  }

  const toggleMic = async () => {
    const room = roomRef.current
    if (!room) return
    const next = !mic
    try {
      await room.localParticipant.setMicrophoneEnabled(next)
      setMic(next)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not change microphone state')
    }
  }

  const toggleCam = async () => {
    const room = roomRef.current
    if (!room) return
    const next = !cam
    try {
      await room.localParticipant.setCameraEnabled(next)
      setCam(next)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not change camera state')
    }
  }

  return {
    roomRef,
    liveRoom,
    roomId,
    roomName,
    visibleParticipants,
    messages,
    chatError,
    setChatError,
    hand,
    mic,
    cam,
    connected,
    connecting,
    connectionFailed,
    setConnectionAttempt,
    error,
    setError,
    audioBlocked,
    setAudioBlocked,
    toggleHand,
    postChat,
    toggleMic,
    toggleCam,
  }
}
