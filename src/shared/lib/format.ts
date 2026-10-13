import type { FocusLinkKind, MaterialKind } from '@/domain/types'

const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
export function timeAgo(iso: string): string {
  const diffMin = Math.round((new Date(iso).getTime() - Date.now()) / 60_000)
  const abs = Math.abs(diffMin)
  if (abs < 60) return rtf.format(diffMin, 'minute')
  if (abs < 60 * 24) return rtf.format(Math.round(diffMin / 60), 'hour')
  return rtf.format(Math.round(diffMin / 1440), 'day')
}
export const formatDate = (iso: string) => new Date(iso).toLocaleDateString('en', { day: 'numeric', month: 'short' })
export const formatTime = (iso: string) => new Date(iso).toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' })
export const formatDay = (iso: string) => new Date(iso).toLocaleDateString('en', { weekday: 'short', day: 'numeric', month: 'short' })
export const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('')

export function isValidUrl(value: string): boolean {
  try { const u = new URL(value); return u.protocol === 'https:' || u.protocol === 'http:' } catch { return false }
}
export const normalizeUrl = (v: string) => (/^https?:\/\//i.test(v.trim()) ? v.trim() : `https://${v.trim()}`)
export const hostOf = (url: string) => { try { return new URL(url).hostname.replace(/^www\./, '') } catch { return url } }

const AI_HOSTS = ['chatgpt.com', 'chat.openai.com', 'gemini.google.com', 'claude.ai', 'copilot.microsoft.com', 'perplexity.ai']
const PRACTICE_HOSTS = ['leetcode.com', 'hackerrank.com', 'sqlzoo.net', 'codeforces.com', 'geeksforgeeks.org', 'sqlbolt.com', 'w3schools.com', 'codechef.com']

export function detectMaterialKind(url: string): MaterialKind {
  const host = hostOf(url)
  if (/\.pdf($|\?)/i.test(url)) return 'pdf'
  if (/(youtube\.com|youtu\.be|vimeo\.com)$/.test(host)) return 'video'
  if (AI_HOSTS.some((h) => host.endsWith(h))) return 'ai'
  if (PRACTICE_HOSTS.some((h) => host.endsWith(h))) return 'practice'
  return 'article'
}
export const focusKindOf = (k: MaterialKind): FocusLinkKind => (k === 'ai' ? 'ai' : k === 'practice' ? 'practice' : 'material')
export const AI_PROVIDERS = [
  { label: 'ChatGPT', url: 'https://chatgpt.com/' },
  { label: 'Gemini', url: 'https://gemini.google.com/' },
  { label: 'Claude', url: 'https://claude.ai/' },
] as const
