const ROOM_CODE = /^[A-Z0-9-]{4,16}$/

export function roomJoinPath(code: string): string {
  return `/j/${encodeURIComponent(code.toUpperCase())}`
}

export function roomInviteUrl(code: string): string {
  return new URL(roomJoinPath(code), window.location.origin).toString()
}

export function parseRoomCode(input: string): string | null {
  const value = input.trim()
  if (!value) return null

  let candidate = value
  if (value.includes('/') || /^https?:/i.test(value)) {
    try {
      const url = new URL(value, 'https://focus-lock.invalid')
      if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
      const path = url.pathname
      const match = path.match(/^\/(?:j|room)\/([^/]+)\/?$/i)
      if (!match) return null
      candidate = decodeURIComponent(match[1] ?? '')
    } catch {
      return null
    }
  }

  const code = candidate.trim().toUpperCase()
  return ROOM_CODE.test(code) ? code : null
}
