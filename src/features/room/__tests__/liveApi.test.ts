import { describe, expect, it } from 'vitest'
import {
  decodeLiveBoardEvent,
  decodeLivePlaybackState,
  decodeLiveStageState,
  encodeLiveBoardEvent,
  encodeLivePlaybackState,
  encodeLiveStageState,
} from '../liveApi'
import { parseYouTubeId } from '../LiveMusicPlayer'

describe('live room events', () => {
  it('round-trips persisted whiteboard strokes', () => {
    const stroke = {
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      userId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      color: '#202124' as const,
      width: 4,
      points: [{ x: 1, y: 2 }, { x: 3, y: 4 }],
      at: '2026-10-12T18:00:00.000Z',
    }
    expect(decodeLiveBoardEvent(encodeLiveBoardEvent({ type: 'stroke', stroke }))).toEqual({ type: 'stroke', stroke })
  })

  describe('shared music URL parsing', () => {
    it('accepts video IDs and supported YouTube video URL forms', () => {
      expect(parseYouTubeId('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
      expect(parseYouTubeId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
      expect(parseYouTubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
      expect(parseYouTubeId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
      expect(parseYouTubeId('https://www.youtube.com/live/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
    })

    it('rejects invalid IDs, other hosts, and playlist-only links', () => {
      expect(parseYouTubeId('too-short')).toBeNull()
      expect(parseYouTubeId('https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ')).toBeNull()
      expect(parseYouTubeId('https://www.youtube.com/playlist?list=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf')).toBeNull()
    })
  })

  it('round-trips custom hex whiteboard colors', () => {
    const stroke = {
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      userId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      color: '#7c3aed',
      width: 4,
      points: [{ x: 1, y: 2 }, { x: 3, y: 4 }],
      at: '2026-10-12T18:00:00.000Z',
    }
    expect(decodeLiveBoardEvent(encodeLiveBoardEvent({ type: 'stroke', stroke }))).toEqual({ type: 'stroke', stroke })
  })

  it('round-trips saved playback without a follow-up database read', () => {
    const state = {
      videoId: 'abcdefghijk',
      isPlaying: true,
      positionSeconds: 42,
      controllerId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      controllerName: 'Ari',
      updatedAt: '2026-10-12T18:00:00.000Z',
    }
    expect(decodeLivePlaybackState(encodeLivePlaybackState(state))).toEqual(state)
  })

  it('round-trips shared Study stage state and rejects malformed packets', () => {
    const state = {
      url: 'https://www.youtube.com/playlist?list=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf',
      title: 'Study playlist',
      kind: 'youtube-playlist' as const,
      controllerId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      controllerName: 'Ari',
      updatedAt: '2026-10-12T18:00:00.000Z',
    }
    expect(decodeLiveStageState(encodeLiveStageState(state))).toEqual(state)
    expect(decodeLiveStageState(new TextEncoder().encode('not json'))).toBeNull()
    expect(decodeLiveStageState(new TextEncoder().encode(JSON.stringify({ type: 'stage', state: { ...state, kind: 'unsafe' } })))).toBeNull()
  })
})
