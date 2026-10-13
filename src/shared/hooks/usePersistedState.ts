import { useCallback, useState } from 'react'

/**
 * Validates that a parsed JSON value has the same keys and basic types as the default.
 * Falls back to the default if the shape is wrong — never crashes or injects unexpected shapes.
 */
function validateShape<T extends object>(parsed: unknown, defaults: T): T {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return defaults
  const obj = parsed as Record<string, unknown>
  const def = defaults as Record<string, unknown>
  const result: Record<string, unknown> = { ...def }
  for (const key of Object.keys(defaults)) {
    if (key in obj && typeof obj[key] === typeof def[key]) {
      result[key] = obj[key]
    }
    // If key is missing or wrong type, keep the default
  }
  return result as T
}

/** localStorage-backed state for device-level preferences. Falls back to memory if storage is blocked. */
export function usePersistedState<T extends object>(key: string, initial: T): [T, (next: T | ((p: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      if (!raw) return initial
      const parsed: unknown = JSON.parse(raw)
      return validateShape(parsed, initial)
    } catch {
      return initial
    }
  })
  const set = useCallback((next: T | ((p: T) => T)) => {
    setValue((prev) => {
      const v = typeof next === 'function' ? (next as (p: T) => T)(prev) : next
      try { localStorage.setItem(key, JSON.stringify(v)) } catch { /* ignore */ }
      return v
    })
  }, [key])
  return [value, set]
}
