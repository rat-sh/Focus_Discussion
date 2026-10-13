import type { CameraMode } from '@/domain/types'
import { usePersistedState } from '@/shared/hooks/usePersistedState'

export interface Prefs {
  cameraMode: CameraMode
  restBudgetPct: number
  musicVolume: number
}
export const DEFAULT_PREFS: Prefs = { cameraMode: 'visible', restBudgetPct: 10, musicVolume: 40 }
export const usePrefs = () => usePersistedState<Prefs>('prefs.v1', DEFAULT_PREFS)

// AI key feature has been removed (security risk: secret in localStorage with no consumer).
// Legacy key cleanup runs in main.tsx on app start.
