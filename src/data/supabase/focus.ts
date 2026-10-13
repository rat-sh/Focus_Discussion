import type { FocusPlan, FocusSessionRecord, QualitySegment } from '@/domain/types'
import type { FocusRepo } from '../repositories'
import { uid } from './common'
import { getSupabase } from './client'
import { fromSupabase } from './errors'

function mapSession(
  row: {
    id: string
    title: string
    started_at: string
    planned_min: number
    elapsed_sec: number
    rest_budget_pct: number
    tracked: boolean
  },
  segments: QualitySegment[],
): FocusSessionRecord {
  return {
    id: row.id,
    title: row.title,
    startedAt: row.started_at,
    plannedMin: row.planned_min,
    elapsedSec: row.elapsed_sec,
    restBudgetPct: row.rest_budget_pct,
    tracked: row.tracked,
    segments,
  }
}

export const focusRepo: FocusRepo = {
  async lastPlan() {
    const id = await uid()
    const { data, error } = await getSupabase()
      .from('focus_plans')
      .select('title, duration_min, rest_budget_pct, camera_mode, tracking, links')
      .eq('user_id', id)
      .maybeSingle()
    if (error) fromSupabase(error)
    if (!data) return null
    return {
      title: data.title as string,
      durationMin: data.duration_min as number,
      restBudgetPct: data.rest_budget_pct as number,
      camera: data.camera_mode as FocusPlan['camera'],
      tracking: data.tracking as FocusPlan['tracking'],
      links: (data.links ?? []) as FocusPlan['links'],
    }
  },
  async savePlan(plan) {
    const id = await uid()
    const { error } = await getSupabase().from('focus_plans').upsert({
      user_id: id,
      title: plan.title,
      duration_min: plan.durationMin,
      rest_budget_pct: plan.restBudgetPct,
      camera_mode: plan.camera,
      tracking: plan.tracking,
      links: plan.links,
      updated_at: new Date().toISOString(),
    })
    if (error) fromSupabase(error)
  },
  async recent() {
    const id = await uid()
    const { data, error } = await getSupabase()
      .from('focus_sessions')
      .select('id, title, started_at, planned_min, elapsed_sec, rest_budget_pct, tracked')
      .eq('user_id', id)
      .order('started_at', { ascending: false })
      .limit(20)
    if (error) fromSupabase(error)
    const sessions = data ?? []
    if (sessions.length === 0) return []
    const ids = sessions.map((s) => s.id as string)
    const segs = await getSupabase()
      .from('focus_segments')
      .select('session_id, state, start_sec, end_sec')
      .in('session_id', ids)
      .order('seq')
    if (segs.error) fromSupabase(segs.error)
    return sessions.map((s) =>
      mapSession(s, (segs.data ?? [])
        .filter((g) => g.session_id === s.id)
        .map((g) => ({
          state: g.state as QualitySegment['state'],
          startSec: g.start_sec as number,
          endSec: g.end_sec as number,
        }))),
    )
  },
  async get(id) {
    const me = await uid()
    const { data, error } = await getSupabase()
      .from('focus_sessions')
      .select('id, title, started_at, planned_min, elapsed_sec, rest_budget_pct, tracked')
      .eq('id', id)
      .eq('user_id', me)
      .maybeSingle()
    if (error) fromSupabase(error)
    if (!data) return null
    const segs = await getSupabase()
      .from('focus_segments')
      .select('state, start_sec, end_sec')
      .eq('session_id', id)
      .order('seq')
    if (segs.error) fromSupabase(segs.error)
    return mapSession(
      data,
      (segs.data ?? []).map((g) => ({
        state: g.state as QualitySegment['state'],
        startSec: g.start_sec as number,
        endSec: g.end_sec as number,
      })),
    )
  },
  async save(record) {
    const me = await uid()
    const { data, error } = await getSupabase()
      .from('focus_sessions')
      .insert({
        user_id: me,
        title: record.title,
        started_at: record.startedAt,
        planned_min: record.plannedMin,
        elapsed_sec: record.elapsedSec,
        rest_budget_pct: record.restBudgetPct,
        tracked: record.tracked,
      })
      .select('id, title, started_at, planned_min, elapsed_sec, rest_budget_pct, tracked')
      .single()
    if (error || !data) fromSupabase(error)
    if (record.segments.length > 0) {
      const { error: sErr } = await getSupabase().from('focus_segments').insert(
        record.segments.map((s, i) => ({
          session_id: data.id,
          client_segment_id: `s-${String(i)}`,
          seq: i,
          state: s.state,
          start_sec: s.startSec,
          end_sec: s.endSec,
        })),
      )
      if (sErr) fromSupabase(sErr)
    }
    const { error: dErr } = await getSupabase().rpc('rollup_daily_focus', { p_session_id: data.id })
    if (dErr) fromSupabase(dErr)
    const saved = await this.get(data.id as string)
    if (!saved) fromSupabase({ message: 'NOT_FOUND: Session missing after save' })
    return saved
  },
}
