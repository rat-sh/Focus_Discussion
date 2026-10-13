import type { LiveRepo, RoomRepo } from '../repositories'
import type { ChatMessage, Doubt, Participant, Room, RoomPreview } from '@/domain/types'
import { artifactsFor, CHAT, DOUBTS, PARTICIPANTS, RANKS, ROOMS, sessionsFor } from './seed'
import { delay, uid } from './util'

let rooms: Room[] = [...ROOMS]

export const roomRepo: RoomRepo = {
  listMine: () => delay([...rooms]),
  listSessions: (roomId) => delay(sessionsFor(rooms.find((r) => r.id === roomId) ?? rooms[0])),
  listArtifacts: (sessionId) => delay(artifactsFor(sessionId)),
  preview: (code): Promise<RoomPreview> => {
    const c = code.toUpperCase()
    const base = { code: c, hostName: 'Aarav Kumar', mode: 'study' as const }
    if (c === 'FULL-001') return delay({ ...base, name: 'Group Study · Finals', insideCount: 20, availability: 'full' })
    if (c === 'OLD-404') return delay({ ...base, name: 'Last week’s revision', insideCount: 0, availability: 'expired' })
    const room = rooms.find((r) => r.code === c)
    if (!room) return delay({ ...base, name: '', insideCount: 0, availability: 'not-found' })
    return delay({ code: c, name: room.name, hostName: room.ownerName === 'You' ? 'Aarav Kumar' : room.ownerName, mode: room.mode, insideCount: 7, availability: 'open' })
  },
  create: ({ name, topic, mode }) => {
    const room: Room = {
      id: uid('r'), code: `${topic.slice(0, 3).toUpperCase().padEnd(3, 'X')}-${Math.floor(100 + Math.random() * 900)}`,
      name, topic, mode, membership: 'owner', ownerName: 'You', memberCount: 1, sessionCount: 0, lastSessionAt: null,
    }
    rooms = [room, ...rooms]
    return delay(room)
  },
  remove: (id) => {
    rooms = rooms.filter((room) => room.id !== id)
    return delay(undefined)
  },
  join: (code) => {
    const c = code.toUpperCase()
    const room = rooms.find((r) => r.code === c)
    if (!room) {
      return delay({
        id: 'missing', code: c, name: '', topic: '', mode: 'study', membership: 'member',
        ownerName: '', memberCount: 0, sessionCount: 0, lastSessionAt: null,
      })
    }
    return delay(room)
  },
}

let doubts: Doubt[] = [...DOUBTS]
let chat: ChatMessage[] = [...CHAT]

export const liveRepo: LiveRepo = {
  participants: () => delay(PARTICIPANTS.map((p) => ({ ...p }))),
  subscribe: (_code, onChange) => {
    let state: Participant[] = PARTICIPANTS.map((p) => ({ ...p }))
    const timer = setInterval(() => {
      const talkers = state.filter((p) => p.mic)
      const next = talkers[Math.floor(Math.random() * talkers.length)]?.id
      state = state.map((p) => ({ ...p, speaking: p.id === next }))
      onChange(state)
    }, 2600)
    return () => clearInterval(timer)
  },
  doubts: () => delay([...doubts].sort((a, b) => b.votes - a.votes)),
  addDoubt: (_c, text, anonymous) => {
    const d: Doubt = { id: uid('d'), text, author: anonymous ? 'Anonymous' : 'You', anonymous, votes: 1, tag: 'Concept', status: 'open', pinned: false, at: new Date().toISOString() }
    doubts = [d, ...doubts]
    return delay(d)
  },
  voteDoubt: (id) => { doubts = doubts.map((d) => (d.id === id ? { ...d, votes: d.votes + 1 } : d)); return delay(undefined, 60) },
  chat: () => delay([...chat]),
  sendChat: (_c, text) => {
    const m: ChatMessage = { id: uid('c'), author: 'You', text, at: new Date().toISOString(), mine: true }
    chat = [...chat, m]
    return delay(m, 60)
  },
  ranks: () => delay([...RANKS]),
}
