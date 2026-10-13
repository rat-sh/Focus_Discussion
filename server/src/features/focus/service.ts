import type {
  FocusPlanDto,
  FocusSessionDto,
  QualitySegmentDto,
  WeeklyStatsDto,
} from '@studyroom/contract'
import { AppError } from '../../lib/errors'
import * as repo from './repo'

function mapSession(
  session: {
    id: string
    title: string
    started_at: Date
    planned_min: number
    elapsed_sec: number
    rest_budget_pct: number
    tracked: boolean
  },
  segments: { client_segment_id: string | null; state: string; start_sec: number; end_sec: number }[],
): FocusSessionDto {
  return {
    id: session.id,
    title: session.title,
    startedAt: new Date(session.started_at).toISOString(),
    plannedMin: session.planned_min,
    elapsedSec: session.elapsed_sec,
    restBudgetPct: session.rest_budget_pct,
    tracked: session.tracked,
    segments: segments.map((s) => ({
      ...(s.client_segment_id ? { clientSegmentId: s.client_segment_id } : {}),
      state: s.state as QualitySegmentDto['state'],
      startSec: s.start_sec,
      endSec: s.end_sec,
    })),
  }
}

export async function start(
  userId: string,
  body: {
    title: string
    plannedMin: number
    restBudgetPct: number
    tracked: boolean
    cameraMode: 'visible' | 'hidden'
    links: { kind: 'material' | 'practice' | 'ai'; label: string; url: string; host: string }[]
  },
): Promise<FocusSessionDto> {
  const session = await repo.insertSession({
    userId,
    title: body.title,
    plannedMin: body.plannedMin,
    restBudgetPct: body.restBudgetPct,
    tracked: body.tracked,
    cameraMode: body.cameraMode,
    links: body.links,
  })
  return mapSession(
    {
      id: session.id,
      title: body.title,
      started_at: session.started_at,
      planned_min: body.plannedMin,
      elapsed_sec: 0,
      rest_budget_pct: body.restBudgetPct,
      tracked: body.tracked,
    },
    [],
  )
}

export async function stop(userId: string, sessionId: string, elapsedSec: number): Promise<FocusSessionDto> {
  const updated = await repo.stopSession(userId, sessionId, elapsedSec)
  if (!updated) throw AppError.notFound('Session not found')
  const full = await repo.getSession(userId, sessionId)
  if (!full) throw AppError.notFound('Session not found')
  await repo.upsertDailyFromSegments(userId, sessionId)
  return mapSession(full.session, full.segments)
}

export async function get(userId: string, sessionId: string): Promise<FocusSessionDto> {
  const full = await repo.getSession(userId, sessionId)
  if (!full) throw AppError.notFound('Session not found')
  return mapSession(full.session, full.segments)
}

export async function recent(userId: string): Promise<FocusSessionDto[]> {
  const sessions = await repo.recentSessions(userId)
  const ids = sessions.map((s) => s.id)
  const segs = await repo.segmentsForSessions(ids)
  return sessions.map((s) =>
    mapSession(
      s,
      segs.filter((g) => g.session_id === s.id),
    ),
  )
}

export async function writeSegments(
  userId: string,
  sessionId: string,
  segments: QualitySegmentDto[],
): Promise<{ inserted: number }> {
  const inserted = await repo.insertSegments(
    sessionId,
    userId,
    segments.map((s) => ({
      clientSegmentId: s.clientSegmentId,
      state: s.state,
      startSec: s.startSec,
      endSec: s.endSec,
    })),
  )
  if (inserted < 0) throw AppError.notFound('Session not found')
  return { inserted }
}

export async function lastPlan(userId: string): Promise<FocusPlanDto | null> {
  const row = await repo.getPlan(userId)
  if (!row) return null
  const links = Array.isArray(row.links) ? row.links : []
  return {
    title: row.title,
    durationMin: row.duration_min,
    restBudgetPct: row.rest_budget_pct,
    camera: row.camera_mode as FocusPlanDto['camera'],
    tracking: row.tracking as FocusPlanDto['tracking'],
    links: links as FocusPlanDto['links'],
  }
}

export async function savePlan(userId: string, plan: FocusPlanDto): Promise<FocusPlanDto> {
  await repo.savePlan(userId, {
    title: plan.title,
    durationMin: plan.durationMin,
    restBudgetPct: plan.restBudgetPct,
    camera: plan.camera,
    tracking: plan.tracking,
    links: plan.links,
  })
  return plan
}

export async function weekly(userId: string): Promise<WeeklyStatsDto> {
  const rows = await repo.weeklyStats(userId)
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const byDay = new Map(rows.map((r) => [new Date(r.day).toISOString().slice(0, 10), r]))
  const days = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    const row = byDay.get(key)
    days.push({
      day: dayNames[d.getDay()] ?? 'Mon',
      focusedMin: Math.round((row?.focused_sec ?? 0) / 60),
      restMin: Math.round((row?.resting_sec ?? 0) / 60),
      phoneMin: Math.round((row?.phone_sec ?? 0) / 60),
      lapseMin: Math.round((row?.lapse_sec ?? 0) / 60),
    })
  }
  const streak = await repo.streakDays(userId)
  const focusedTotal = days.reduce((a, d) => a + d.focusedMin, 0)
  return {
    days,
    goalMin: 300,
    streakDays: streak,
    scoreAvg: focusedTotal > 0 ? Math.min(100, Math.round(focusedTotal / 3)) : 0,
    doubtsAnswered: 0,
  }
}
