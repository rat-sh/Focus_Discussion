import { describe, expect, it } from 'vitest'
import { embedFor } from '../LinkViewer'
import type { FocusLink } from '@/domain/types'

const link = (url: string, id = 'test'): FocusLink => ({ id, kind: 'material', label: 'Test', url, host: 'test' })

describe('embedFor', () => {
  it('returns null for javascript: URL disguised as PDF', () => {
    expect(embedFor(link('javascript:alert(1)//x.pdf'))).toBeNull()
  })

  it('returns null for JAVASCRIPT: (case-insensitive) URL', () => {
    expect(embedFor(link('JAVASCRIPT:alert(1)'))).toBeNull()
  })

  it('returns null for data: URL', () => {
    expect(embedFor(link('data:text/html,<script>alert(1)</script>'))).toBeNull()
  })

  it('builds YouTube embed from valid watch URL', () => {
    const result = embedFor(link('https://www.youtube.com/watch?v=dQw4w9WgXcQ'))
    expect(result).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')
  })

  it('builds YouTube embed from youtu.be short URL', () => {
    const result = embedFor(link('https://youtu.be/dQw4w9WgXcQ'))
    expect(result).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')
  })

  it('returns null for YouTube URL with invalid ID (too long)', () => {
    expect(embedFor(link('https://www.youtube.com/watch?v=tooLongIdValue'))).toBeNull()
  })

  it('returns null for YouTube URL with special chars in ID', () => {
    expect(embedFor(link('https://www.youtube.com/watch?v=<script>abc'))).toBeNull()
  })

  it('returns null for same-origin URL (sandbox escape prevention)', () => {
    // window.location.origin is typically http://localhost:3000 in tests
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
    expect(embedFor(link(`${origin}/malicious.pdf`))).toBeNull()
  })

  it('returns null for PDF URL (Chrome PDF viewer blocked in sandboxed iframe)', () => {
    // PDFs should NOT be embedded because Chrome's PDF viewer is blocked
    // inside sandboxed iframes. They are opened in a new tab instead.
    expect(embedFor(link('https://example.com/notes.pdf'))).toBeNull()
  })

  it('returns null for non-embeddable HTTPS URLs', () => {
    expect(embedFor(link('https://claude.ai/'))).toBeNull()
  })

  it('returns null for empty URL', () => {
    expect(embedFor(link(''))).toBeNull()
  })

  it('returns null for URL with credentials', () => {
    expect(embedFor(link('https://admin:pass@example.com/file.pdf'))).toBeNull()
  })
})
