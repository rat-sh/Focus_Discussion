import type {
  ChatMessage, Doubt, FocusPlan, FocusSessionRecord, Friend, FriendRequest, Material, Participant,
  PersonLite, Profile, QualitySegment, QualityState, RankRow, Room, ScheduledSession, SessionArtifact,
  SessionSummary, WeeklyStats,
} from '@/domain/types'
import { daysAgo, hostOf, inHours } from './util'

export const ME: Profile = { id: 'u_me', name: 'Aarav Kumar', handle: 'aarav.k', email: 'aarav@example.com', avatarUrl: null, streakDays: 12 }

const P = (id: string, name: string): PersonLite => ({ id, name, handle: name.toLowerCase().replace(/\s+/g, '.'), avatarUrl: null })

// ---- people ----------------------------------------------------------------------
export const FRIENDS: Friend[] = [
  { ...P('u_ish', 'Ishita Rao'), presence: 'in-room', roomName: 'LRU Cache · Interview Prep', roomCode: 'DSA-482', focus: 'focused' },
  { ...P('u_rah', 'Rahul Mehta'), presence: 'in-room', roomName: 'SQL Practice Night', roomCode: 'SQL-118', focus: 'resting' },
  { ...P('u_mee', 'Meera Nair'), presence: 'online' },
  { ...P('u_san', 'Sana Sheikh'), presence: 'online' },
  { ...P('u_dev', 'Dev Malhotra'), presence: 'offline' },
  { ...P('u_tar', 'Tara Iyer'), presence: 'offline' },
  { ...P('u_kar', 'Karan Joshi'), presence: 'offline' },
  { ...P('u_pri', 'Priya Das'), presence: 'online' },
]
export const REQUESTS: FriendRequest[] = [
  { id: 'fr_1', direction: 'incoming', user: P('u_kab', 'Kabir Singh'), at: daysAgo(0, 9) },
  { id: 'fr_2', direction: 'incoming', user: P('u_diy', 'Diya Nair'), at: daysAgo(1, 18) },
  { id: 'fr_3', direction: 'outgoing', user: P('u_arj', 'Arjun Mehta'), at: daysAgo(2, 12) },
]
export const DIRECTORY: PersonLite[] = [
  P('u_vih', 'Vihaan Reddy'), P('u_ana', 'Anaya Gupta'), P('u_roh', 'Rohan Kapoor'), P('u_neh', 'Neha Verma'),
  P('u_zoy', 'Zoya Khan'), P('u_imr', 'Imran Ali'), P('u_nis', 'Nisha Pillai'), P('u_yas', 'Yash Agarwal'),
]

// ---- rooms -----------------------------------------------------------------------
export const ROOMS: Room[] = [
  { id: 'r_1', code: 'DSA-482', name: 'LRU Cache · Interview Prep', topic: 'DSA', mode: 'study', membership: 'owner', ownerName: 'You', memberCount: 12, sessionCount: 4, lastSessionAt: daysAgo(0, 10) },
  { id: 'r_2', code: 'SYS-210', name: 'System Design Mock', topic: 'System Design', mode: 'teach', membership: 'owner', ownerName: 'You', memberCount: 20, sessionCount: 3, lastSessionAt: daysAgo(2, 20) },
  { id: 'r_3', code: 'DBM-905', name: 'DBMS Revision', topic: 'Databases', mode: 'study', membership: 'owner', ownerName: 'You', memberCount: 6, sessionCount: 2, lastSessionAt: daysAgo(5, 19) },
  { id: 'r_4', code: 'DPC-331', name: 'Dynamic Programming Circle', topic: 'DSA', mode: 'study', membership: 'member', ownerName: 'Ishita Rao', memberCount: 8, sessionCount: 6, lastSessionAt: daysAgo(1, 21) },
  { id: 'r_5', code: 'SQL-118', name: 'SQL Practice Night', topic: 'Databases', mode: 'study', membership: 'member', ownerName: 'Rahul Mehta', memberCount: 14, sessionCount: 9, lastSessionAt: daysAgo(3, 21) },
  { id: 'r_6', code: 'RCT-742', name: 'React Rendering Deep Dive', topic: 'Web', mode: 'teach', membership: 'member', ownerName: 'Meera Nair', memberCount: 18, sessionCount: 2, lastSessionAt: daysAgo(9, 18) },
]

const SESSION_TITLES = ['Warm-up and recap', 'Hash map + linked list', 'Eviction strategies', 'Mock interview round', 'Doubt clearing', 'Practice sprint']
export function sessionsFor(room: Room): SessionSummary[] {
  return Array.from({ length: room.sessionCount }, (_, i) => ({
    id: `${room.id}_s${room.sessionCount - i}`,
    roomId: room.id,
    title: `${SESSION_TITLES[i % SESSION_TITLES.length]}`,
    startedAt: daysAgo(i * 3 + (room.lastSessionAt ? 0 : 1), 18 + (i % 3)),
    durationMin: 45 + ((i * 17) % 60),
    attendees: Math.max(2, room.memberCount - i * 2),
    qualityScore: i % 4 === 3 ? null : 90 - i * 5,
  }))
}
export function artifactsFor(sessionId: string): SessionArtifact[] {
  const k = sessionId.length % 3
  const base: SessionArtifact[] = [
    { id: `${sessionId}_a1`, sessionId, kind: 'board', title: 'Board · 3 pages', meta: 'PNG + PDF · 2.4 MB' },
    { id: `${sessionId}_a2`, sessionId, kind: 'recap', title: 'Session recap', meta: 'Attendance, quality, polls' },
    { id: `${sessionId}_a3`, sessionId, kind: 'doubts', title: 'Doubts', meta: `${4 + k} answered · ${k} open` },
    { id: `${sessionId}_a4`, sessionId, kind: 'material', title: 'Materials used', meta: `${2 + k} links` },
  ]
  return k === 0 ? [...base, { id: `${sessionId}_a5`, sessionId, kind: 'transcript', title: 'Captions transcript', meta: 'Text · 18 KB' }] : base
}

// ---- live room -------------------------------------------------------------------
const NAMES = ['Aarav Kumar', 'Ishita Rao', 'Rahul Mehta', 'Meera Nair', 'Sana Sheikh', 'Kabir Singh', 'Diya Nair', 'Arjun Mehta', 'Neha Verma', 'Vihaan Reddy',
  'Anaya Gupta', 'Rohan Kapoor', 'Tara Iyer', 'Dev Malhotra', 'Priya Das', 'Karan Joshi', 'Zoya Khan', 'Imran Ali', 'Nisha Pillai', 'Yash Agarwal']
const FOCUS_CYCLE: (QualityState | null)[] = ['focused', 'focused', 'focused', 'resting', 'focused', 'phone', 'focused', 'focused', 'lapse', 'focused']
export const PARTICIPANTS: Participant[] = NAMES.map((name, i) => ({
  id: i === 0 ? ME.id : `p_${i}`,
  name,
  role: i === 0 ? 'host' : i === 1 ? 'presenter' : 'member',
  mic: i % 3 !== 0,
  cam: i % 4 !== 3,
  speaking: i === 1,
  handOrder: i === 2 ? 1 : null,
  focus: FOCUS_CYCLE[i % FOCUS_CYCLE.length],
}))

export const DOUBTS: Doubt[] = [
  { id: 'd_1', text: 'Why do we move the recently accessed node to the head instead of the tail?', author: 'Ishita', anonymous: false, votes: 12, tag: 'Concept', status: 'open', pinned: true, at: daysAgo(0, 10) },
  { id: 'd_2', text: 'My hashmap updates, but the linked list keeps the stale value.', author: 'Anonymous', anonymous: true, votes: 8, tag: 'Debugging', status: 'open', pinned: false, at: daysAgo(0, 10) },
  { id: 'd_3', text: 'Would an interviewer accept OrderedDict here?', author: 'Meera', anonymous: false, votes: 5, tag: 'Interview', status: 'answered', pinned: false, at: daysAgo(0, 10) },
]
export const CHAT: ChatMessage[] = [
  { id: 'c_1', author: 'Ishita', text: 'Can we redo the eviction case once more?', at: daysAgo(0, 10), mine: false },
  { id: 'c_2', author: 'Rahul', text: 'Sharing my approach in Materials in a minute.', at: daysAgo(0, 10), mine: false },
  { id: 'c_3', author: 'You', text: 'Sure. Board page 2 has the diagram.', at: daysAgo(0, 10), mine: true },
]
export const RANKS: RankRow[] = [
  { userId: 'p_1', name: 'Ishita Rao', qualityMin: 212, score: 94, mine: false },
  { userId: ME.id, name: 'Aarav Kumar', qualityMin: 187, score: 91, mine: true },
  { userId: 'p_3', name: 'Meera Nair', qualityMin: 176, score: 88, mine: false },
  { userId: 'p_2', name: 'Rahul Mehta', qualityMin: 150, score: 83, mine: false },
  { userId: 'p_4', name: 'Sana Sheikh', qualityMin: 131, score: 79, mine: false },
]

// ---- library & schedule ------------------------------------------------------------
const M = (id: string, kind: Material['kind'], title: string, url: string, scope: Material['scope'], scopeLabel: string, tags: string[], d: number, sizeKb?: number): Material =>
  ({ id, kind, title, url, host: hostOf(url), scope, scopeLabel, tags, addedAt: daysAgo(d), sizeKb })
export const MATERIALS: Material[] = [
  M('m_1', 'video', 'SQL Joins Explained (visual)', 'https://www.youtube.com/watch?v=9yeOJ0ZMUYw', 'personal', 'My library', ['SQL'], 1),
  M('m_2', 'pdf', 'Database Normalization Notes.pdf', 'https://files.studyroom.app/dbms-normalization.pdf', 'personal', 'My library', ['DBMS'], 2, 1240),
  M('m_3', 'practice', 'LeetCode 146 · LRU Cache', 'https://leetcode.com/problems/lru-cache/', 'room', 'LRU Cache · Interview Prep', ['DSA'], 0),
  M('m_4', 'practice', 'SQLZoo interactive tutorial', 'https://sqlzoo.net/', 'personal', 'My library', ['SQL'], 4),
  M('m_5', 'article', 'System Design Primer', 'https://github.com/donnemartin/system-design-primer', 'room', 'System Design Mock', ['System Design'], 6),
  M('m_6', 'ai', 'ChatGPT', 'https://chatgpt.com/', 'personal', 'My library', ['AI'], 20),
  M('m_7', 'ai', 'Gemini', 'https://gemini.google.com/', 'personal', 'My library', ['AI'], 20),
  M('m_8', 'ai', 'Claude', 'https://claude.ai/', 'personal', 'My library', ['AI'], 20),
  M('m_9', 'notes', 'Linked list cheat sheet', 'https://files.studyroom.app/linked-list.pdf', 'room', 'DBMS Revision', ['DSA'], 8, 380),
]
export const SCHEDULE: ScheduledSession[] = [
  { id: 'sc_1', title: 'System Design Mock', topic: 'System Design', startsAt: inHours(0.8), durationMin: 90, roomCode: 'SYS-210', going: 6, recurring: 'Weekly' },
  { id: 'sc_2', title: 'Dynamic Programming', topic: 'DSA', startsAt: inHours(24), durationMin: 60, roomCode: 'DPC-331', going: 12, recurring: null },
  { id: 'sc_3', title: 'Database Indexes', topic: 'Databases', startsAt: inHours(52), durationMin: 60, roomCode: 'DBM-905', going: 8, recurring: 'Weekly' },
  { id: 'sc_4', title: 'React Rendering', topic: 'Web', startsAt: inHours(120), durationMin: 75, roomCode: 'RCT-742', going: 15, recurring: null },
]

// ---- focus & stats -----------------------------------------------------------------
const seg = (rows: [QualityState, number][]): QualitySegment[] => {
  let t = 0
  return rows.map(([state, min]) => { const s = { state, startSec: t, endSec: t + min * 60 }; t += min * 60; return s })
}
export const FOCUS_RECENT: FocusSessionRecord[] = [
  { id: 'f_3', title: 'SQL joins', startedAt: daysAgo(0, 8), plannedMin: 60, elapsedSec: 3600, restBudgetPct: 10, tracked: true,
    segments: seg([['focused', 22], ['resting', 4], ['focused', 18], ['phone', 3], ['focused', 9], ['lapse', 2], ['focused', 2]]) },
  { id: 'f_2', title: 'DP revision', startedAt: daysAgo(1, 20), plannedMin: 120, elapsedSec: 7200, restBudgetPct: 10, tracked: true,
    segments: seg([['focused', 40], ['resting', 8], ['focused', 31], ['idle', 6], ['focused', 15], ['lapse', 20]]) },
  { id: 'f_1', title: 'OS notes', startedAt: daysAgo(3, 19), plannedMin: 45, elapsedSec: 2700, restBudgetPct: 10, tracked: true,
    segments: seg([['focused', 26], ['resting', 4], ['focused', 15]]) },
]
export const LAST_PLAN: FocusPlan = {
  title: 'SQL joins', durationMin: 60, restBudgetPct: 10, camera: 'visible', tracking: 'camera',
  links: [
    { id: 'l_1', kind: 'material', label: 'SQL Joins Explained (visual)', url: 'https://www.youtube.com/watch?v=9yeOJ0ZMUYw', host: 'youtube.com' },
    { id: 'l_2', kind: 'practice', label: 'SQLZoo interactive tutorial', url: 'https://sqlzoo.net/', host: 'sqlzoo.net' },
    { id: 'l_3', kind: 'ai', label: 'Claude', url: 'https://claude.ai/', host: 'claude.ai' },
  ],
}
export const WEEKLY: WeeklyStats = {
  goalMin: 18 * 60, streakDays: 12, scoreAvg: 86, doubtsAnswered: 18,
  days: [
    { day: 'Mon', focusedMin: 130, restMin: 14, phoneMin: 6, lapseMin: 4 },
    { day: 'Tue', focusedMin: 165, restMin: 18, phoneMin: 9, lapseMin: 3 },
    { day: 'Wed', focusedMin: 90, restMin: 10, phoneMin: 12, lapseMin: 8 },
    { day: 'Thu', focusedMin: 180, restMin: 16, phoneMin: 4, lapseMin: 2 },
    { day: 'Fri', focusedMin: 140, restMin: 12, phoneMin: 7, lapseMin: 11 },
    { day: 'Sat', focusedMin: 75, restMin: 9, phoneMin: 5, lapseMin: 0 },
    { day: 'Sun', focusedMin: 40, restMin: 5, phoneMin: 3, lapseMin: 1 },
  ],
}
