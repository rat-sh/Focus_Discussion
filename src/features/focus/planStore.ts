import type { FocusLink, FocusPlan, Material } from '@/domain/types'
import { focusKindOf } from '@/shared/lib/format'

// The active plan survives a page reload. Progress does not: a reload restarts the session timer.
const PLAN = 'focus.plan.v1'
const DRAFT = 'focus.draftLinks.v1'

function read<T>(k: string, guard: (v: unknown) => v is T): T | null {
  try {
    const r = sessionStorage.getItem(k)
    if (!r) return null
    const parsed: unknown = JSON.parse(r)
    return guard(parsed) ? parsed : null
  } catch {
    return null
  }
}

const write = (k: string, v: unknown) => { try { sessionStorage.setItem(k, JSON.stringify(v)) } catch { /* ignore */ } }

// Type guards for stored data
function isFocusLink(v: unknown): v is FocusLink {
  if (typeof v !== 'object' || v === null) return false
  const o = v as Record<string, unknown>
  return typeof o.id === 'string' && typeof o.kind === 'string' && typeof o.label === 'string' && typeof o.url === 'string' && typeof o.host === 'string'
}

function isFocusLinkArray(v: unknown): v is FocusLink[] {
  return Array.isArray(v) && v.every(isFocusLink)
}

function isFocusPlan(v: unknown): v is FocusPlan {
  if (typeof v !== 'object' || v === null) return false
  const o = v as Record<string, unknown>
  return (
    typeof o.title === 'string' &&
    typeof o.durationMin === 'number' &&
    typeof o.restBudgetPct === 'number' &&
    (o.camera === 'visible' || o.camera === 'hidden') &&
    (o.tracking === 'camera' || o.tracking === 'none') &&
    Array.isArray(o.links) && o.links.every(isFocusLink)
  )
}

export const loadPlan = () => read(PLAN, isFocusPlan)
export const savePlan = (p: FocusPlan) => write(PLAN, p)
export const clearPlan = () => { try { sessionStorage.removeItem(PLAN) } catch { /* ignore */ } }

/** Materials the user picked in the library, waiting to be added to the next Focus plan. */
export function saveDraftLinks(materials: Material[]) {
  const links: FocusLink[] = materials.map((m) => ({ id: `lib_${m.id}`, kind: focusKindOf(m.kind), label: m.title, url: m.url, host: m.host }))
  write(DRAFT, links)
}
export function takeDraftLinks(): FocusLink[] {
  const l = read(DRAFT, isFocusLinkArray) ?? []
  try { sessionStorage.removeItem(DRAFT) } catch { /* ignore */ }
  return l
}
export const peekDraftLinks = () => read(DRAFT, isFocusLinkArray) ?? []
