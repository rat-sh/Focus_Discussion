import { describe, expect, it } from 'vitest'
import { noEmbedReason, resolveStudyEmbed } from '../studyEmbed'

const src = (link: string) => resolveStudyEmbed(new URL(link))?.src ?? null
const kind = (link: string) => resolveStudyEmbed(new URL(link))?.kind ?? null
const PL = 'PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf'
const NOCOOKIE = 'https://www.youtube-nocookie.com/embed'

describe('resolveStudyEmbed: single videos', () => {
  it('handles watch, youtu.be, shorts, live, embed and mobile/music hosts', () => {
    const expected = `${NOCOOKIE}/dQw4w9WgXcQ`
    expect(src('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(expected)
    expect(src('https://youtu.be/dQw4w9WgXcQ')).toBe(expected)
    expect(src('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe(expected)
    expect(src('https://www.youtube.com/live/dQw4w9WgXcQ')).toBe(expected)
    expect(src('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe(expected)
    expect(src('https://m.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(expected)
    expect(src('https://music.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(expected)
  })

  it('keeps the start time from t= or start=', () => {
    expect(src('https://youtu.be/dQw4w9WgXcQ?t=90')).toBe(`${NOCOOKIE}/dQw4w9WgXcQ?start=90`)
    expect(src('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=1m30s')).toBe(`${NOCOOKIE}/dQw4w9WgXcQ?start=90`)
    expect(src('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=1h2m3s')).toBe(`${NOCOOKIE}/dQw4w9WgXcQ?start=3723`)
    expect(src('https://www.youtube.com/watch?v=dQw4w9WgXcQ&start=45')).toBe(`${NOCOOKIE}/dQw4w9WgXcQ?start=45`)
  })

  it('ignores a zero, junk or oversized start time safely', () => {
    expect(src('https://youtu.be/dQw4w9WgXcQ?t=0')).toBe(`${NOCOOKIE}/dQw4w9WgXcQ`)
    expect(src('https://youtu.be/dQw4w9WgXcQ?t=abc')).toBe(`${NOCOOKIE}/dQw4w9WgXcQ`)
    expect(src('https://youtu.be/dQw4w9WgXcQ?t=999999')).toBe(`${NOCOOKIE}/dQw4w9WgXcQ?start=86400`)
  })

  it('rejects bad video IDs', () => {
    expect(src('https://www.youtube.com/watch?v=tooLongIdValue')).toBeNull()
    expect(src('https://www.youtube.com/watch?v=<script>abc')).toBeNull()
    expect(src('https://www.youtube.com/watch')).toBeNull()
  })

  it('does not mistake the 11-letter path "videoseries" for a video ID', () => {
    expect(src('https://www.youtube.com/embed/videoseries')).toBeNull()
    expect(src(`https://www.youtube.com/embed/videoseries?list=${PL}`)).toBe(`${NOCOOKIE}/videoseries?list=${PL}`)
  })
})

describe('resolveStudyEmbed: playlists', () => {
  it('embeds a playlist page', () => {
    expect(kind(`https://www.youtube.com/playlist?list=${PL}`)).toBe('youtube-playlist')
    expect(src(`https://www.youtube.com/playlist?list=${PL}`)).toBe(`${NOCOOKIE}/videoseries?list=${PL}`)
  })

  it('keeps the playlist when a video inside it is opened', () => {
    expect(kind(`https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=${PL}`)).toBe('youtube-video')
    expect(src(`https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=${PL}`)).toBe(`${NOCOOKIE}/dQw4w9WgXcQ?list=${PL}`)
  })

  it('ignores auto-generated "RD" mixes and plays the single video instead', () => {
    expect(src('https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=RDdQw4w9WgXcQ')).toBe(`${NOCOOKIE}/dQw4w9WgXcQ`)
    expect(src('https://www.youtube.com/playlist?list=RDdQw4w9WgXcQ')).toBeNull()
  })

  it('rejects playlist IDs with unsafe characters', () => {
    expect(src('https://www.youtube.com/playlist?list=<script>alert(1)</script>')).toBeNull()
    expect(src('https://www.youtube.com/playlist?list=short')).toBeNull()
  })
})

describe('resolveStudyEmbed: channels', () => {
  it('embeds a channel through its uploads playlist (UC becomes UU)', () => {
    expect(kind('https://www.youtube.com/channel/UCBJycsmduvYEL83R_U4JriQ')).toBe('youtube-channel')
    expect(src('https://www.youtube.com/channel/UCBJycsmduvYEL83R_U4JriQ')).toBe(`${NOCOOKIE}/videoseries?list=UUBJycsmduvYEL83R_U4JriQ`)
  })

  it('cannot embed @handle, /c/ and /user/ pages without calling the YouTube API', () => {
    expect(src('https://www.youtube.com/@mkbhd')).toBeNull()
    expect(src('https://www.youtube.com/c/somechannel')).toBeNull()
    expect(src('https://www.youtube.com/user/somebody')).toBeNull()
    expect(src('https://www.youtube.com/channel/UCtooShort')).toBeNull()
  })
})

describe('resolveStudyEmbed: other sites and look-alikes', () => {
  it('returns null for non-YouTube links', () => {
    expect(src('https://leetcode.com/problems/lru-cache/')).toBeNull()
    expect(src('https://example.com/notes.pdf')).toBeNull()
  })

  it('does not trust look-alike hosts', () => {
    expect(src('https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ')).toBeNull()
    expect(src('https://notyoutube.com/watch?v=dQw4w9WgXcQ')).toBeNull()
    expect(src('https://evil-youtu.be/dQw4w9WgXcQ')).toBeNull()
  })
})

describe('noEmbedReason', () => {
  it('explains PDFs, channel pages and other sites', () => {
    expect(noEmbedReason(new URL('https://example.com/Notes.PDF'))).toBe('pdf')
    expect(noEmbedReason(new URL('https://www.youtube.com/@mkbhd'))).toBe('youtube-channel-page')
    expect(noEmbedReason(new URL('https://www.youtube.com/c/somechannel'))).toBe('youtube-channel-page')
    expect(noEmbedReason(new URL('https://leetcode.com/problems/lru-cache/'))).toBe('site')
  })
})