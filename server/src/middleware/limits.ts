export interface RateLimitClass {
  key: string
  /** Tokens added per interval. */
  rate: number
  /** Interval length in seconds. */
  intervalSec: number
  /** Burst capacity. */
  burst: number
  /** failClosed when Valkey is down. */
  failClosed: boolean
}

/** Start values; tune in one place. */
export const LIMITS = {
  global: { key: 'global', rate: 300, intervalSec: 60, burst: 300, failClosed: false },
  'auth.login': { key: 'auth.login', rate: 10, intervalSec: 15 * 60, burst: 10, failClosed: true },
  'auth.register': { key: 'auth.register', rate: 5, intervalSec: 3600, burst: 5, failClosed: true },
  'room.preview': { key: 'room.preview', rate: 30, intervalSec: 60, burst: 30, failClosed: false },
  'room.join.ip': { key: 'room.join.ip', rate: 10, intervalSec: 60, burst: 10, failClosed: true },
  'room.join.user': { key: 'room.join.user', rate: 20, intervalSec: 60, burst: 20, failClosed: true },
  'room.token': { key: 'room.token', rate: 30, intervalSec: 60, burst: 30, failClosed: true },
  'chat.send': { key: 'chat.send', rate: 5, intervalSec: 3, burst: 5, failClosed: false },
  'room.live.read': { key: 'room.live.read', rate: 180, intervalSec: 60, burst: 100, failClosed: true },
  'room.live.write': { key: 'room.live.write', rate: 120, intervalSec: 60, burst: 60, failClosed: true },
  'room.live.board.write': { key: 'room.live.board.write', rate: 240, intervalSec: 60, burst: 100, failClosed: true },
  'room.live.playback.write': { key: 'room.live.playback.write', rate: 30, intervalSec: 60, burst: 30, failClosed: true },
  'youtube.search': { key: 'youtube.search', rate: 30, intervalSec: 60, burst: 20, failClosed: true },
  'youtube.status': { key: 'youtube.status', rate: 100, intervalSec: 60, burst: 100, failClosed: true },
  'schedule.write': { key: 'schedule.write', rate: 20, intervalSec: 60, burst: 20, failClosed: true },
  'profile.avatar': { key: 'profile.avatar', rate: 5, intervalSec: 60, burst: 5, failClosed: true },
  search: { key: 'search', rate: 30, intervalSec: 60, burst: 30, failClosed: false },
  write: { key: 'write', rate: 60, intervalSec: 60, burst: 60, failClosed: false },
} as const satisfies Record<string, RateLimitClass>

export type LimitName = keyof typeof LIMITS
