import type { SQL } from 'bun'
import { getSql } from '../../db/sql'

export async function insertSession(
  input: {
    userId: string
    title: string
    plannedMin: number
    restBudgetPct: number
    tracked: boolean
    cameraMode: string
    links: { kind: string; label: string; url: string; host: string }[]
  },
  db: SQL = getSql(),
) {
  return db.begin(async (tx) => {
    const rows = await tx<{ id: string; started_at: Date }[]>`
      INSERT INTO focus_sessions (user_id, title, planned_min, rest_budget_pct, tracked, camera_mode)
      VALUES (
        ${input.userId}::uuid, ${input.title}, ${input.plannedMin},
        ${input.restBudgetPct}, ${input.tracked}, ${input.cameraMode}
      )
      RETURNING id, started_at
    `
    const session = rows[0]
    if (!session) throw new Error('insert session failed')
    let pos = 0
    for (const link of input.links) {
      await tx`
        INSERT INTO focus_links (session_id, position, kind, label, url, host)
        VALUES (${session.id}::uuid, ${pos}, ${link.kind}, ${link.label}, ${link.url}, ${link.host})
      `
      pos += 1
    }
    return session
  })
}

export async function stopSession(
  userId: string,
  sessionId: string,
  elapsedSec: number,
  db: SQL = getSql(),
) {
  const rows = await db<{ id: string }[]>`
    UPDATE focus_sessions
    SET elapsed_sec = ${elapsedSec}
    WHERE id = ${sessionId}::uuid AND user_id = ${userId}::uuid
    RETURNING id
  `
  return rows[0] ?? null
}

export async function getSession(userId: string, sessionId: string, db: SQL = getSql()) {
  const sessions = await db<{
    id: string
    title: string
    started_at: Date
    planned_min: number
    elapsed_sec: number
    rest_budget_pct: number
    tracked: boolean
  }[]>`
    SELECT id, title, started_at, planned_min, elapsed_sec, rest_budget_pct, tracked
    FROM focus_sessions
    WHERE id = ${sessionId}::uuid AND user_id = ${userId}::uuid
    LIMIT 1
  `
  const session = sessions[0]
  if (!session) return null
  const segments = await db<{
    client_segment_id: string | null
    state: string
    start_sec: number
    end_sec: number
  }[]>`
    SELECT client_segment_id, state, start_sec, end_sec
    FROM focus_segments WHERE session_id = ${sessionId}::uuid
    ORDER BY seq ASC
  `
  return { session, segments }
}

export async function recentSessions(userId: string, db: SQL = getSql()) {
  return db<{
    id: string
    title: string
    started_at: Date
    planned_min: number
    elapsed_sec: number
    rest_budget_pct: number
    tracked: boolean
  }[]>`
    SELECT id, title, started_at, planned_min, elapsed_sec, rest_budget_pct, tracked
    FROM focus_sessions
    WHERE user_id = ${userId}::uuid
    ORDER BY started_at DESC
    LIMIT 20
  `
}

export async function segmentsForSessions(sessionIds: string[], db: SQL = getSql()) {
  if (sessionIds.length === 0) return []
  return db<{
    session_id: string
    client_segment_id: string | null
    state: string
    start_sec: number
    end_sec: number
  }[]>`
    SELECT session_id, client_segment_id, state, start_sec, end_sec
    FROM focus_segments
    WHERE session_id = ANY(${sessionIds}::uuid[])
    ORDER BY session_id, seq
  `
}

export async function insertSegments(
  sessionId: string,
  userId: string,
  segments: { clientSegmentId?: string; state: string; startSec: number; endSec: number }[],
  db: SQL = getSql(),
): Promise<number> {
  const owned = await db<{ id: string }[]>`
    SELECT id FROM focus_sessions WHERE id = ${sessionId}::uuid AND user_id = ${userId}::uuid LIMIT 1
  `
  if (!owned[0]) return -1

  const maxRows = await db<{ max: number | null }[]>`
    SELECT max(seq) AS max FROM focus_segments WHERE session_id = ${sessionId}::uuid
  `
  let seq = (maxRows[0]?.max ?? -1) + 1
  let inserted = 0

  for (const seg of segments) {
    if (seg.clientSegmentId) {
      const existing = await db<{ id: string }[]>`
        SELECT id FROM focus_segments
        WHERE session_id = ${sessionId}::uuid AND client_segment_id = ${seg.clientSegmentId}
        LIMIT 1
      `
      if (existing[0]) continue
    }
    await db`
      INSERT INTO focus_segments (session_id, client_segment_id, seq, state, start_sec, end_sec)
      VALUES (
        ${sessionId}::uuid,
        ${seg.clientSegmentId ?? null},
        ${seq},
        ${seg.state},
        ${seg.startSec},
        ${seg.endSec}
      )
    `
    seq += 1
    inserted += 1
  }
  return inserted
}

export async function upsertDailyFromSegments(userId: string, sessionId: string, db: SQL = getSql()) {
  await db`
    INSERT INTO daily_focus (user_id, day, focused_sec, resting_sec, phone_sec, lapse_sec, idle_sec)
    SELECT
      ${userId}::uuid,
      (SELECT started_at::date FROM focus_sessions WHERE id = ${sessionId}::uuid),
      COALESCE(SUM(end_sec - start_sec) FILTER (WHERE state = 'focused'), 0),
      COALESCE(SUM(end_sec - start_sec) FILTER (WHERE state = 'resting'), 0),
      COALESCE(SUM(end_sec - start_sec) FILTER (WHERE state = 'phone'), 0),
      COALESCE(SUM(end_sec - start_sec) FILTER (WHERE state = 'lapse'), 0),
      COALESCE(SUM(end_sec - start_sec) FILTER (WHERE state = 'idle'), 0)
    FROM focus_segments
    WHERE session_id = ${sessionId}::uuid
    ON CONFLICT (user_id, day) DO UPDATE SET
      focused_sec = daily_focus.focused_sec + EXCLUDED.focused_sec,
      resting_sec = daily_focus.resting_sec + EXCLUDED.resting_sec,
      phone_sec = daily_focus.phone_sec + EXCLUDED.phone_sec,
      lapse_sec = daily_focus.lapse_sec + EXCLUDED.lapse_sec,
      idle_sec = daily_focus.idle_sec + EXCLUDED.idle_sec
  `
}

export async function getPlan(userId: string, db: SQL = getSql()) {
  const rows = await db<{
    title: string
    duration_min: number
    rest_budget_pct: number
    camera_mode: string
    tracking: string
    links: unknown
  }[]>`
    SELECT title, duration_min, rest_budget_pct, camera_mode, tracking, links
    FROM focus_plans WHERE user_id = ${userId}::uuid LIMIT 1
  `
  return rows[0] ?? null
}

export async function savePlan(
  userId: string,
  plan: {
    title: string
    durationMin: number
    restBudgetPct: number
    camera: string
    tracking: string
    links: unknown
  },
  db: SQL = getSql(),
) {
  await db`
    INSERT INTO focus_plans (user_id, title, duration_min, rest_budget_pct, camera_mode, tracking, links, updated_at)
    VALUES (
      ${userId}::uuid, ${plan.title}, ${plan.durationMin}, ${plan.restBudgetPct},
      ${plan.camera}, ${plan.tracking}, ${JSON.stringify(plan.links)}::jsonb, now()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      title = EXCLUDED.title,
      duration_min = EXCLUDED.duration_min,
      rest_budget_pct = EXCLUDED.rest_budget_pct,
      camera_mode = EXCLUDED.camera_mode,
      tracking = EXCLUDED.tracking,
      links = EXCLUDED.links,
      updated_at = now()
  `
}

export async function weeklyStats(userId: string, db: SQL = getSql()) {
  return db<{
    day: Date
    focused_sec: number
    resting_sec: number
    phone_sec: number
    lapse_sec: number
  }[]>`
    SELECT day, focused_sec, resting_sec, phone_sec, lapse_sec
    FROM daily_focus
    WHERE user_id = ${userId}::uuid
      AND day >= (CURRENT_DATE - INTERVAL '6 days')
    ORDER BY day ASC
  `
}

export async function streakDays(userId: string, db: SQL = getSql()) {
  const rows = await db<{ streak_days: number }[]>`
    SELECT streak_days FROM profiles WHERE user_id = ${userId}::uuid LIMIT 1
  `
  return rows[0]?.streak_days ?? 0
}
