import type { FocusRepo, StatsRepo } from '../repositories'
import type { FocusSessionRecord } from '@/domain/types'
import { FOCUS_RECENT, LAST_PLAN, WEEKLY } from './seed'
import { delay, uid } from './util'

let records: FocusSessionRecord[] = [...FOCUS_RECENT]
let plan = { ...LAST_PLAN }
export const focusRepo: FocusRepo = {
  lastPlan: () => delay({ ...plan }),
  savePlan: (next) => { plan = { ...next, links: next.links.map((l) => ({ ...l })) }; return delay(undefined) },
  recent: () => delay([...records]),
  get: (id) => delay(records.find((r) => r.id === id) ?? null),
  save: (rec) => { const saved = { ...rec, id: uid('f') }; records = [saved, ...records]; return delay(saved) },
}
export const statsRepo: StatsRepo = { weekly: () => delay({ ...WEEKLY }) }
