/** Server-side safe URL: https only (http allowed when NODE_ENV !== production). */
export function safeHttpUrl(input: string, allowHttp: boolean): URL | null {
  const trimmed = input.trim()
  if (trimmed.length === 0 || trimmed.length > 2048) return null
  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    return null
  }
  const protocol = url.protocol.toLowerCase()
  if (protocol === 'https:') {
    /* ok */
  } else if (protocol === 'http:') {
    if (!allowHttp) return null
  } else {
    return null
  }
  if (url.username || url.password) return null
  return url
}
