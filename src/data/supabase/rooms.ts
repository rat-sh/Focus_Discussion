import type { RoomMode, RoomPreview } from '@/domain/types'
import type { LiveRepo, RoomRepo } from '../repositories'
import { asArray, asObject, mapRoom } from './common'
import { getSupabase } from './client'
import { fromSupabase, unavailable } from './errors'

export const roomRepo: RoomRepo = {
  async listMine() {
    const { data, error } = await getSupabase().rpc('list_my_rooms')
    if (error) fromSupabase(error)
    return asArray<Parameters<typeof mapRoom>[0]>(data).map(mapRoom)
  },
  async listSessions() {
    return []
  },
  async listArtifacts() {
    return []
  },
  async preview(code) {
    const { data, error } = await getSupabase().rpc('preview_room', { p_code: code })
    if (error) fromSupabase(error)
    const preview = asObject<RoomPreview>(data)
    if (!preview) fromSupabase({ message: 'NOT_FOUND: Room not found' })
    return preview
  },
  async create(input: { name: string; topic: string; mode: RoomMode }) {
    const { data, error } = await getSupabase().rpc('create_room', {
      p_name: input.name,
      p_topic: input.topic,
      p_mode: input.mode,
    })
    if (error) fromSupabase(error)
    const row = asObject<Parameters<typeof mapRoom>[0]>(data)
    if (!row) fromSupabase({ message: 'INTERNAL: create_room returned empty' })
    return mapRoom(row)
  },
  async remove(id) {
    const { error } = await getSupabase().rpc('delete_room', { p_room_id: id })
    if (error) fromSupabase(error)
  },
  async join(code) {
    const { data, error } = await getSupabase().rpc('join_room', { p_code: code })
    if (error) fromSupabase(error)
    const row = asObject<Parameters<typeof mapRoom>[0]>(data)
    if (!row) fromSupabase({ message: 'NOT_FOUND: Room not found' })
    return mapRoom(row)
  },
}

export const liveRepo: LiveRepo = {
  participants: async () => unavailable('Live video'),
  subscribe: () => () => undefined,
  doubts: async () => unavailable('Doubts'),
  addDoubt: async () => unavailable('Doubts'),
  voteDoubt: async () => unavailable('Doubts'),
  chat: async () => unavailable('Chat'),
  sendChat: async () => unavailable('Chat'),
  ranks: async () => unavailable('Live ranks'),
}
