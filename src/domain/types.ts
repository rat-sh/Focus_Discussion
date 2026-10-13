// Domain types. They mirror the future database tables 1:1 (see docs/DATA_CONTRACT.md).
export type ID = string
export type ISODate = string

export interface Profile {
  id: ID
  name: string
  handle: string
  email: string
  avatarUrl: string | null
  streakDays: number
}

// ---- Rooms & session folders -------------------------------------------------
export type RoomMode = 'study' | 'teach'
export type Membership = 'owner' | 'member'

export interface Room {
  id: ID
  code: string
  name: string
  topic: string
  mode: RoomMode
  membership: Membership
  ownerName: string
  memberCount: number
  sessionCount: number
  lastSessionAt: ISODate | null
}

export type RoomAvailability = 'open' | 'full' | 'expired' | 'not-found'
export interface RoomPreview {
  code: string
  name: string
  hostName: string
  mode: RoomMode
  insideCount: number
  availability: RoomAvailability
}

export interface SessionSummary {
  id: ID
  roomId: ID
  title: string
  startedAt: ISODate
  durationMin: number
  attendees: number
  qualityScore: number | null
}

export type ArtifactKind = 'board' | 'recap' | 'doubts' | 'material' | 'transcript'
export interface SessionArtifact {
  id: ID
  sessionId: ID
  kind: ArtifactKind
  title: string
  meta: string
}

// ---- Live room ---------------------------------------------------------------
export type ParticipantRole = 'host' | 'presenter' | 'member'
export interface Participant {
  id: ID
  name: string
  role: ParticipantRole
  mic: boolean
  cam: boolean
  speaking: boolean
  handOrder: number | null
  focus: QualityState | null // shared only when the person opted in
}

export interface Doubt {
  id: ID
  text: string
  author: string
  anonymous: boolean
  votes: number
  tag: string
  status: 'open' | 'answered'
  pinned: boolean
  at: ISODate
}

export interface ChatMessage {
  id: ID
  author: string
  text: string
  at: ISODate
  mine: boolean
}

export interface RankRow {
  userId: ID
  name: string
  qualityMin: number
  score: number
  mine: boolean
}

// ---- Social & library ----------------------------------------------------------
export type Presence = 'online' | 'in-room' | 'offline'
export interface PersonLite {
  id: ID
  name: string
  handle: string
  avatarUrl: string | null
}
export interface Friend extends PersonLite {
  presence: Presence
  roomName?: string
  roomCode?: string
  focus?: QualityState
}
export interface FriendRequest {
  id: ID
  direction: 'incoming' | 'outgoing'
  user: PersonLite
  at: ISODate
}
export type RelationState = 'none' | 'friend' | 'incoming' | 'outgoing' | 'self'
export interface PersonSearchHit extends PersonLite {
  relation: RelationState
  mutualFriends: number
}

export type MaterialKind = 'pdf' | 'video' | 'article' | 'practice' | 'ai' | 'notes'
export type MaterialScope = 'personal' | 'room'
export interface Material {
  id: ID
  kind: MaterialKind
  title: string
  url: string
  host: string
  roomId?: ID
  scope: MaterialScope
  scopeLabel: string
  tags: string[]
  addedAt: ISODate
  sizeKb?: number
}
export interface NewMaterial {
  kind: MaterialKind
  title: string
  url?: string
  file?: File
  roomId?: ID
  tags: string[]
}

export interface ScheduledSession {
  id: ID
  roomId?: ID
  title: string
  topic: string
  startsAt: ISODate
  durationMin: number
  roomCode: string
  going: number
  recurring: string | null
  isOrganizer?: boolean
}

// ---- Focus Lock & quality tracking -----------------------------------------------
// focused = studying | studying = on external tab | phone = phone in use | resting = allowed break | lapse = away / asleep / not attentive
// idle = not verified (page hidden, camera suspended). Never counts as quality time.
export type QualityState = 'focused' | 'studying' | 'phone' | 'resting' | 'lapse' | 'idle'
export type CameraMode = 'visible' | 'hidden'
/** camera = face tracking on. none = plain timer, saved as not tracked and never ranked. */
export type TrackingMode = 'camera' | 'none'
export type FocusLinkKind = 'material' | 'practice' | 'ai'

export interface FocusLink {
  id: ID
  kind: FocusLinkKind
  label: string
  url: string
  host: string
}
export interface FocusPlan {
  title: string
  durationMin: number
  restBudgetPct: number
  camera: CameraMode
  tracking: TrackingMode
  links: FocusLink[]
}
export interface QualitySegment {
  state: QualityState
  startSec: number
  endSec: number
}
export interface FocusSessionRecord {
  id: ID
  title: string
  startedAt: ISODate
  plannedMin: number
  elapsedSec: number
  restBudgetPct: number
  tracked: boolean
  segments: QualitySegment[]
}

export interface DayQuality {
  day: string // Mon..Sun
  focusedMin: number
  restMin: number
  phoneMin: number
  lapseMin: number
}
export interface WeeklyStats {
  days: DayQuality[]
  goalMin: number
  streakDays: number
  scoreAvg: number
  doubtsAnswered: number
}
