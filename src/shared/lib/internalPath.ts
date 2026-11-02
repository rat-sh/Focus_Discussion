export function safeInternalPath(value: unknown, fallback = '/'): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return fallback
  try {
    const origin = 'https://focus-lock.invalid'
    const url = new URL(value, origin)
    if (url.origin !== origin) return fallback
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return fallback
  }
}
