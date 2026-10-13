// The ONLY contract the UI depends on. Swap the mock for Supabase by implementing these interfaces.
// Each method maps to exactly one query / RPC (see docs/DATA_CONTRACT.md). No per-row loops.
import type {
  ChatMessage, Doubt, FocusPlan, FocusSessionRecord, Friend, FriendRequest, ID, Material, NewMaterial,
  Participant, PersonSearchHit, Profile, RankRow, Room, RoomMode, RoomPreview, ScheduledSession,
  SessionArtifact, SessionSummary, WeeklyStats,
} from '@/domain/types'

export interface ProfileRepo {
  get(): Promise<Profile>
  update(patch: Partial<Pick<Profile, 'name' | 'handle'>>): Promise<Profile>
  setAvatar(file: File | null): Promise<Profile>
  /** Public lookup for /u/:handle. Null when no such user. */
  byHandle(handle: string): Promise<PersonSearchHit | null>
}

export interface RoomRepo {
  listMine(): Promise<Room[]>
  listSessions(roomId: ID): Promise<SessionSummary[]>
  listArtifacts(sessionId: ID): Promise<SessionArtifact[]>
  preview(code: string): Promise<RoomPreview>
  create(input: { name: string; topic: string; mode: RoomMode }): Promise<Room>
  remove(id: ID): Promise<void>
  join(code: string): Promise<Room>
}

export interface LiveRepo {
  participants(code: string): Promise<Participant[]>
  /** Realtime presence. Returns an unsubscribe function. */
  subscribe(code: string, onChange: (p: Participant[]) => void): () => void
  doubts(code: string): Promise<Doubt[]>
  addDoubt(code: string, text: string, anonymous: boolean): Promise<Doubt>
  voteDoubt(id: ID): Promise<void>
  chat(code: string): Promise<ChatMessage[]>
  sendChat(code: string, text: string): Promise<ChatMessage>
  ranks(code: string): Promise<RankRow[]>
}

export interface FriendRepo {
  list(): Promise<Friend[]>
  requests(): Promise<FriendRequest[]>
  search(query: string): Promise<PersonSearchHit[]>
  sendRequest(userId: ID): Promise<void>
  respond(requestId: ID, accept: boolean): Promise<void>
  cancel(requestId: ID): Promise<void>
  remove(friendId: ID): Promise<void>
}

export interface MaterialRepo {
  list(roomId?: ID): Promise<Material[]>
  add(input: NewMaterial): Promise<Material>
  remove(id: ID): Promise<void>
}

export interface ScheduleRepo {
  upcoming(): Promise<ScheduledSession[]>
  create(input: { roomId?: ID; title: string; topic: string; startsAt: string; durationMin: number }): Promise<ScheduledSession>
  update(id: ID, input: { roomId: ID; title: string; topic: string; startsAt: string; durationMin: number }): Promise<ScheduledSession>
  remove(id: ID): Promise<void>
}

export interface FocusRepo {
  lastPlan(): Promise<FocusPlan | null>
  savePlan(plan: FocusPlan): Promise<void>
  recent(): Promise<FocusSessionRecord[]>
  get(id: ID): Promise<FocusSessionRecord | null>
  save(record: Omit<FocusSessionRecord, 'id'>): Promise<FocusSessionRecord>
}

export interface StatsRepo {
  weekly(): Promise<WeeklyStats>
}

export interface Repos {
  /** 'mock' shows a visible prototype notice. Real repositories set 'live' and the notice disappears. */
  kind: 'mock' | 'live'
  profile: ProfileRepo
  rooms: RoomRepo
  live: LiveRepo
  friends: FriendRepo
  materials: MaterialRepo
  schedule: ScheduleRepo
  focus: FocusRepo
  stats: StatsRepo
}
