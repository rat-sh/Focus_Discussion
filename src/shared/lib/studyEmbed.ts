/**
 * Turns a study link into something the room can show inline.
 *
 * This file is pure and has no imports on purpose. Callers must already have checked the URL with
 * `safeHttpUrl` and rejected same-origin links (see `embedFor` in LinkViewer). Here we only decide
 * HOW a safe URL can be embedded.
 *
 * Supported today: YouTube videos, playlists, "video inside a playlist", Shorts, Live, and whole
 * channels (via the channel's automatic "uploads" playlist).
 */

export type StudyEmbedKind = 'youtube-video' | 'youtube-playlist' | 'youtube-channel'

export interface StudyEmbed {
  kind: StudyEmbedKind
  /** Value for the iframe `src`. Always https and always on youtube-nocookie.com. */
  src: string
}

/** Why a link could not be embedded. The UI uses it to explain what to do next. */
export type NoEmbedReason = 'pdf' | 'youtube-channel-page' | 'site'

const EMBED_BASE = 'https://www.youtube-nocookie.com/embed'
const VIDEO_ID = /^[\w-]{11}$/
const LIST_ID = /^[\w-]{10,64}$/
/** Channel IDs are "UC" + 22 characters. */
const CHANNEL_ID = /^UC[\w-]{22}$/
const MAX_START_SECONDS = 86400

const YOUTUBE_HOSTS = new Set(['youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtube-nocookie.com'])

function normalizedHost(url: URL): string {
  return url.hostname.toLowerCase().replace(/^www\./, '')
}

function isYouTubeHost(host: string): boolean {
  return host === 'youtu.be' || YOUTUBE_HOSTS.has(host)
}

/** Accepts "90", "1m30s", "1h2m3s". Returns whole seconds, or null when missing, zero or invalid. */
function parseStart(value: string | null): number | null {
  if (!value) return null
  let seconds: number
  if (/^\d{1,6}$/.test(value)) {
    seconds = Number(value)
  } else {
    const match = /^(?:(\d{1,3})h)?(?:(\d{1,3})m)?(?:(\d{1,6})s)?$/.exec(value)
    if (!match || (!match[1] && !match[2] && !match[3])) return null
    seconds = Number(match[1] ?? 0) * 3600 + Number(match[2] ?? 0) * 60 + Number(match[3] ?? 0)
  }
  if (!Number.isFinite(seconds) || seconds <= 0) return null
  return Math.min(seconds, MAX_START_SECONDS)
}

function withParams(path: string, params: [string, string | number | null][]): string {
  const query = new URLSearchParams()
  for (const [key, value] of params) if (value !== null) query.set(key, String(value))
  const text = query.toString()
  return `${EMBED_BASE}/${path}${text ? `?${text}` : ''}`
}

/**
 * Returns an embeddable player for the URL, or null when it cannot be embedded safely.
 * Use `noEmbedReason` to find out why.
 */
export function resolveStudyEmbed(url: URL): StudyEmbed | null {
  const host = normalizedHost(url)
  if (!isYouTubeHost(host)) return null

  const parts = url.pathname.split('/').filter(Boolean)

  let videoId: string | null
  if (host === 'youtu.be') videoId = parts[0] ?? null
  else if (parts[0] === 'embed' || parts[0] === 'shorts' || parts[0] === 'live' || parts[0] === 'v') videoId = parts[1] ?? null
  else videoId = url.searchParams.get('v')
  // "embed/videoseries" is a real path that happens to be exactly 11 characters long.
  if (videoId === 'videoseries' || (videoId !== null && !VIDEO_ID.test(videoId))) videoId = null

  // "RD..." lists are YouTube's auto-generated mixes. They do not embed reliably, so we ignore them.
  const rawList = url.searchParams.get('list')
  const listId = rawList && LIST_ID.test(rawList) && !rawList.startsWith('RD') ? rawList : null

  const start = parseStart(url.searchParams.get('t') ?? url.searchParams.get('start'))

  if (videoId) {
    return { kind: 'youtube-video', src: withParams(videoId, [['list', listId], ['start', start]]) }
  }
  if (listId) {
    return { kind: 'youtube-playlist', src: withParams('videoseries', [['list', listId]]) }
  }
  if (parts[0] === 'channel' && parts[1] && CHANNEL_ID.test(parts[1])) {
    // Every channel has a hidden "uploads" playlist: same ID with "UC" swapped for "UU".
    return { kind: 'youtube-channel', src: withParams('videoseries', [['list', `UU${parts[1].slice(2)}`]]) }
  }
  return null
}

/** Explains why `resolveStudyEmbed` returned null, so the screen can show useful help. */
export function noEmbedReason(url: URL): NoEmbedReason {
  if (url.pathname.toLowerCase().endsWith('.pdf')) return 'pdf'
  const host = normalizedHost(url)
  if (isYouTubeHost(host)) {
    const first = url.pathname.split('/').filter(Boolean)[0] ?? ''
    if (first.startsWith('@') || first === 'c' || first === 'user' || first === 'channel') return 'youtube-channel-page'
  }
  return 'site'
}