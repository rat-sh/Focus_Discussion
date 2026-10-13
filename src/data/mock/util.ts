// Mock-only helpers. Deleted together with the rest of data/mock when real data is wired.
export const delay = <T>(value: T, ms = 140): Promise<T> => new Promise((r) => setTimeout(() => r(value), ms))
let n = 0
export const uid = (p = 'id') => `${p}_${(++n).toString(36)}${Math.random().toString(36).slice(2, 6)}`
const DAY = 86_400_000
export const daysAgo = (d: number, hour = 10) => {
  const t = new Date(Date.now() - d * DAY)
  t.setHours(hour, 0, 0, 0)
  return t.toISOString()
}
export const inHours = (h: number) => new Date(Date.now() + h * 3_600_000).toISOString()
export const hostOf = (url: string) => {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return url }
}
