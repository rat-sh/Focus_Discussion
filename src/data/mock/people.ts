import type { FriendRepo, ProfileRepo } from '../repositories'
import type { Friend, FriendRequest, PersonLite, PersonSearchHit, Profile } from '@/domain/types'
import { DIRECTORY, FRIENDS, ME, REQUESTS } from './seed'
import { delay, daysAgo } from './util'

let profile: Profile = { ...ME }
let friends: Friend[] = [...FRIENDS]
let requests: FriendRequest[] = [...REQUESTS]
export const profileRepo: ProfileRepo = {
  get: () => delay({ ...profile }),
  byHandle: (handle) => {
    const h = handle.toLowerCase()
    const all: PersonLite[] = [profile, ...DIRECTORY, ...friends, ...requests.map((r) => r.user)]
    const p = all.find((x) => x.handle === h)
    if (!p) return delay(null)
    const relation = p.id === profile.id ? 'self' : friends.some((f) => f.id === p.id) ? 'friend' : requests.find((r) => r.user.id === p.id)?.direction ?? 'none'
    return delay({ ...p, relation, mutualFriends: p.name.length % 5 } as PersonSearchHit)
  },
  update: (patch) => { profile = { ...profile, ...patch }; return delay({ ...profile }) },
  setAvatar: (file) =>
    new Promise<Profile>((resolve) => {
      if (!file) { profile = { ...profile, avatarUrl: null }; resolve({ ...profile }); return }
      const reader = new FileReader()
      reader.onload = () => { profile = { ...profile, avatarUrl: String(reader.result) }; resolve({ ...profile }) }
      reader.readAsDataURL(file)
    }),
}


export const friendRepo: FriendRepo = {
  list: () => delay([...friends]),
  requests: () => delay([...requests]),
  search: (q) => {
    const needle = q.trim().toLowerCase()
    if (needle.length < 2) return delay([])
    const pool = new Map<string, PersonLite>()
    for (const p of [...DIRECTORY, ...friends, ...requests.map((r) => r.user)]) pool.set(p.id, p)
    const hits: PersonSearchHit[] = [...pool.values()]
      .filter((p) => p.name.toLowerCase().includes(needle) || p.handle.includes(needle))
      .slice(0, 8)
      .map((p) => ({
        ...p,
        relation: friends.some((f) => f.id === p.id) ? 'friend'
          : requests.find((r) => r.user.id === p.id)?.direction === 'incoming' ? 'incoming'
          : requests.find((r) => r.user.id === p.id)?.direction === 'outgoing' ? 'outgoing' : 'none',
        mutualFriends: p.name.length % 5,
      }))
    return delay(hits)
  },
  sendRequest: (userId) => {
    const user = DIRECTORY.find((p) => p.id === userId)
    if (user) requests = [{ id: `fr_${userId}`, direction: 'outgoing', user, at: daysAgo(0, 12) }, ...requests]
    return delay(undefined)
  },
  respond: (id, accept) => {
    const req = requests.find((r) => r.id === id)
    requests = requests.filter((r) => r.id !== id)
    if (req && accept) friends = [{ ...req.user, presence: 'online' }, ...friends]
    return delay(undefined)
  },
  cancel: (id) => { requests = requests.filter((r) => r.id !== id); return delay(undefined) },
  remove: (id) => { friends = friends.filter((f) => f.id !== id); return delay(undefined) },
}
