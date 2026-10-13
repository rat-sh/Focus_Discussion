import { describe, expect, it } from 'vitest'
import { safeHttpUrl, isValidYouTubeId } from '@/shared/lib/safeUrl'

describe('safeHttpUrl', () => {
  it('accepts plain https URLs', () => {
    const url = safeHttpUrl('https://example.com/page')
    expect(url).not.toBeNull()
    expect(url!.href).toBe('https://example.com/page')
  })

  it('rejects javascript: protocol', () => {
    expect(safeHttpUrl('javascript:alert(1)')).toBeNull()
  })

  it('rejects JAVASCRIPT: (case-insensitive)', () => {
    expect(safeHttpUrl('JAVASCRIPT:alert(1)')).toBeNull()
  })

  it('rejects javascript: with leading whitespace', () => {
    expect(safeHttpUrl('  javascript:alert(1)')).toBeNull()
  })

  it('rejects javascript: disguised as pdf', () => {
    expect(safeHttpUrl('javascript:alert(1)//x.pdf')).toBeNull()
  })

  it('rejects data: URLs', () => {
    expect(safeHttpUrl('data:text/html,<script>alert(1)</script>')).toBeNull()
  })

  it('rejects blob: URLs', () => {
    expect(safeHttpUrl('blob:https://example.com/some-uuid')).toBeNull()
  })

  it('rejects file: URLs', () => {
    expect(safeHttpUrl('file:///etc/passwd')).toBeNull()
  })

  it('rejects URLs with credentials (userinfo)', () => {
    expect(safeHttpUrl('https://admin:password@example.com/')).toBeNull()
  })

  it('rejects URLs with username only', () => {
    expect(safeHttpUrl('https://admin@example.com/')).toBeNull()
  })

  it('rejects overly long URLs (> 2048 chars)', () => {
    const long = 'https://example.com/' + 'a'.repeat(2048)
    expect(safeHttpUrl(long)).toBeNull()
  })

  it('rejects empty string', () => {
    expect(safeHttpUrl('')).toBeNull()
  })

  it('rejects whitespace-only string', () => {
    expect(safeHttpUrl('   ')).toBeNull()
  })

  it('accepts URLs with unicode host', () => {
    // URL constructor encodes unicode hosts to punycode
    const url = safeHttpUrl('https://münchen.de/')
    expect(url).not.toBeNull()
  })

  it('trims whitespace around valid URLs', () => {
    const url = safeHttpUrl('  https://example.com  ')
    expect(url).not.toBeNull()
  })

  it('rejects invalid URL strings', () => {
    expect(safeHttpUrl('not-a-url')).toBeNull()
  })
})

describe('isValidYouTubeId', () => {
  it('accepts valid 11-char IDs', () => {
    expect(isValidYouTubeId('dQw4w9WgXcQ')).toBe(true)
    expect(isValidYouTubeId('abc-def_123')).toBe(true)
  })

  it('rejects IDs too short', () => {
    expect(isValidYouTubeId('abc')).toBe(false)
  })

  it('rejects IDs too long', () => {
    expect(isValidYouTubeId('dQw4w9WgXcQx')).toBe(false)
  })

  it('rejects IDs with special characters', () => {
    expect(isValidYouTubeId('abc<script>')).toBe(false)
  })

  it('rejects empty string', () => {
    expect(isValidYouTubeId('')).toBe(false)
  })
})
