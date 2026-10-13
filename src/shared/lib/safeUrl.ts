/**
 * Validates a URL string for safe use in hrefs and iframe srcs.
 * Accepts only https: (and http: in dev mode).
 * Rejects javascript:, data:, blob:, file:, credentials in URL, and over-long URLs.
 */
export function safeHttpUrl(input: string): URL | null {
  const trimmed = input.trim()

  // Reject over-long URLs (browsers typically cap around 2048)
  if (trimmed.length === 0 || trimmed.length > 2048) return null

  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    return null
  }

  // Only allow http(s) protocols
  const protocol = url.protocol.toLowerCase()
  if (protocol === 'https:') {
    // always allowed
  } else if (protocol === 'http:') {
    // http only in dev
    if (import.meta.env.PROD) return null
  } else {
    // javascript:, data:, blob:, file:, etc.
    return null
  }

  // Reject credentials in URLs (userinfo section)
  if (url.username || url.password) return null

  return url
}

/** Validates a YouTube video ID. Must be exactly 11 word/hyphen characters. */
export function isValidYouTubeId(id: string): boolean {
  return /^[\w-]{11}$/.test(id)
}
