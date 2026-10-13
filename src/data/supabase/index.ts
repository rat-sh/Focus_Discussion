import type { Repos } from '../repositories'
import { focusRepo } from './focus'
import { friendRepo } from './friends'
import { materialRepo } from './materials'
import { profileRepo } from './profiles'
import { liveRepo, roomRepo } from './rooms'
import { scheduleRepo } from './scheduleRepo'
import { statsRepo } from './stats'

export const supabaseRepos: Repos = {
  kind: 'live',
  profile: profileRepo,
  rooms: roomRepo,
  live: liveRepo,
  friends: friendRepo,
  materials: materialRepo,
  schedule: scheduleRepo,
  focus: focusRepo,
  stats: statsRepo,
}
