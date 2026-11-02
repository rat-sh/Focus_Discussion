import { afterEach, describe, expect, it, vi } from 'vitest'
import { parseRoomCode, roomInviteUrl, roomJoinPath } from '../roomLinks'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('room links', () => {
  it('uses one consistent join path', () => {
    expect(roomJoinPath('ab12-cd')).toBe('/j/AB12-CD')
  })

  it('builds the invite URL from the current origin', () => {
    vi.stubGlobal('window', { location: { origin: 'https://focus-discussion.onrender.com' } })
    expect(roomInviteUrl('ab12-cd')).toBe('https://focus-discussion.onrender.com/j/AB12-CD')
  })

  it('accepts room codes and invite links', () => {
    expect(parseRoomCode('ab12-cd')).toBe('AB12-CD')
    expect(parseRoomCode('https://focus-discussion.onrender.com/j/ab12-cd')).toBe('AB12-CD')
    expect(parseRoomCode('/j/ab12-cd')).toBe('AB12-CD')
    expect(parseRoomCode('/room/ab12-cd')).toBe('AB12-CD')
  })

  it('rejects malformed codes and unrelated links', () => {
    expect(parseRoomCode('abc')).toBeNull()
    expect(parseRoomCode('https://example.com/other/ab12-cd')).toBeNull()
  })
})
