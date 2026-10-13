import { describe, expect, it } from 'vitest'
import {
  decodeLiveBoardEvent,
  decodeLivePlaybackState,
  encodeLiveBoardEvent,
  encodeLivePlaybackState,
} from '../liveApi'

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
})
