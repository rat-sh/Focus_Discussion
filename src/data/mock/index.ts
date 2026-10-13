import type { Repos } from '../repositories'
import { friendRepo, profileRepo } from './people'
import { liveRepo, roomRepo } from './rooms'
import { materialRepo, scheduleRepo } from './library'
import { focusRepo, statsRepo } from './focus'

export const mockRepos: Repos = {
  kind: 'mock',
  profile: profileRepo, rooms: roomRepo, live: liveRepo, friends: friendRepo,
  materials: materialRepo, schedule: scheduleRepo, focus: focusRepo, stats: statsRepo,
}
