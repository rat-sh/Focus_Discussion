import type { MaterialRepo, ScheduleRepo } from '../repositories'
import type { Material, ScheduledSession } from '@/domain/types'
import { MATERIALS, SCHEDULE } from './seed'
import { delay, hostOf, uid } from './util'

let materials: Material[] = [...MATERIALS]
export const materialRepo: MaterialRepo = {
  list: (roomId) => delay([...materials]
    .filter((material) => !roomId || material.scope !== 'room' || !material.roomId || material.roomId === roomId)
    .sort((a, b) => b.addedAt.localeCompare(a.addedAt))),
  add: (input) => {
    const url = input.file ? URL.createObjectURL(input.file) : input.url ?? ''
    const m: Material = {
      id: uid('m'), kind: input.kind, title: input.title, url, tags: input.tags,
      ...(input.roomId ? { roomId: input.roomId } : {}),
      host: input.file ? 'Uploaded PDF' : hostOf(url),
      scope: input.roomId ? 'room' : 'personal',
      scopeLabel: input.roomId ? 'Room' : 'My library',
      addedAt: new Date().toISOString(),
      ...(input.file ? { sizeKb: Math.ceil(input.file.size / 1024) } : {}),
    }
    materials = [m, ...materials]
    return delay(m)
  },
  remove: (id) => { materials = materials.filter((m) => m.id !== id); return delay(undefined) },
}

let schedule: ScheduledSession[] = [...SCHEDULE]
export const scheduleRepo: ScheduleRepo = {
  upcoming: () => delay([...schedule].sort((a, b) => a.startsAt.localeCompare(b.startsAt))),
  create: (input) => {
    const s: ScheduledSession = { id: uid('sc'), ...input, roomCode: 'NEW-001', going: 1, recurring: null }
    schedule = [...schedule, s]
    return delay(s)
  },
  update: (id, input) => {
    const existing = schedule.find((session) => session.id === id)
    if (!existing) return Promise.reject(new Error('Scheduled session not found'))
    const updated = { ...existing, ...input }
    schedule = schedule.map((session) => session.id === id ? updated : session)
    return delay(updated)
  },
  remove: (id) => {
    schedule = schedule.filter((session) => session.id !== id)
    return delay(undefined)
  },
}
