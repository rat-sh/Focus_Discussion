import { describe, expect, it } from 'vitest'
import { formatClock, pushSample, summarize } from '../focus'
import { classify, freshDwell, THRESHOLDS } from '@/features/focus/engine/classify'
import type { Signals } from '@/features/focus/engine/types'
import type { QualitySegment } from '../types'
import { detectMaterialKind, isValidUrl, normalizeUrl } from '@/shared/lib/format'
import { toEmbed } from '@/features/music/MusicProvider'

const seg = (state: QualitySegment['state'], a: number, b: number): QualitySegment => ({ state, startSec: a, endSec: b })

describe('summarize', () => {
  it('counts only focused time as quality and keeps rest within budget free', () => {
    // 60 min planned, 10% rest budget = 6 min. 5 min rest is fully free.
    const s = summarize([seg('focused', 0, 3000), seg('resting', 3000, 3300), seg('phone', 3300, 3600)], 3600, 10)
    expect(s.qualitySec).toBe(3000)
    expect(s.restAllowedSec).toBe(300)
    expect(s.restExcessSec).toBe(0)
    expect(s.score).toBe(Math.round((3000 / (3600 - 300)) * 100))
  })
  it('penalises rest beyond the budget', () => {
    const s = summarize([seg('focused', 0, 1800), seg('resting', 1800, 3600)], 3600, 10)
    expect(s.restAllowedSec).toBe(360)
    expect(s.restExcessSec).toBe(1440)
    expect(s.score).toBeLessThan(60)
  })
  it('a student who sleeps through the clock gets a near-zero score', () => {
    const s = summarize([seg('lapse', 0, 7200)], 7200, 10)
    expect(s.qualitySec).toBe(0)
    expect(s.score).toBe(0)
  })
  it('never divides by zero', () => { expect(summarize([], 3600, 10).score).toBe(0) })
})

describe('pushSample', () => {
  it('merges consecutive samples of the same state', () => {
    let s: QualitySegment[] = []
    for (let t = 1; t <= 5; t++) s = pushSample(s, 'focused', t)
    expect(s).toHaveLength(1)
    expect(s[0].endSec).toBe(5)
  })
  it('starts a new segment when the state changes', () => {
    let s = pushSample([], 'focused', 1)
    s = pushSample(s, 'phone', 2)
    expect(s.map((x) => x.state)).toEqual(['focused', 'phone'])
    expect(s[1].startSec).toBe(1)
  })
  it('merges across larger time steps when gap is given', () => {
    let s = pushSample([], 'focused', 30, 30)
    s = pushSample(s, 'focused', 60, 30)
    expect(s).toHaveLength(1)
  })
})

describe('classify', () => {
  const base: Signals = { faceCount: 1, eyesClosed: 0.1, yawDeg: 0, pitchDeg: 0, phoneVisible: false }
  const run = (sig: Signals, seconds: number) => {
    let d = freshDwell(); let state = 'focused'
    for (let i = 0; i < seconds; i++) { const r = classify(sig, d); d = r.dwell; state = r.state }
    return state
  }
  it('attentive face is focused', () => { expect(run(base, 30)).toBe('focused') })
  it('briefly missing face is unconfirmed, then becomes a lapse if absence continues', () => {
    expect(run({ ...base, faceCount: 0 }, THRESHOLDS.noFaceSec)).toBe('lapse')
    expect(run({ ...base, faceCount: 0 }, THRESHOLDS.noFaceSec - 1)).toBe('idle')
  })
  it('eyes closed for several seconds is a lapse (asleep)', () => { expect(run({ ...base, eyesClosed: 0.9 }, THRESHOLDS.eyesClosedSec)).toBe('lapse') })
  it('a normal blink is ignored', () => { expect(run({ ...base, eyesClosed: 0.9 }, 1)).toBe('focused') })
  it('phone visible with head down is phone use', () => { expect(run({ ...base, phoneVisible: true, pitchDeg: 30 }, THRESHOLDS.phoneSec)).toBe('phone') })
  it('phone use also works when the detector reports the opposite pitch sign', () => { expect(run({ ...base, phoneVisible: true, pitchDeg: -30 }, THRESHOLDS.phoneSec)).toBe('phone') })
  it('a phone on the desk with the head up is not phone use', () => { expect(run({ ...base, phoneVisible: true, pitchDeg: 2 }, 20)).toBe('focused') })
  it('looking sideways for a long time is a lapse', () => { expect(run({ ...base, yawDeg: 50 }, THRESHOLDS.lookAwaySec)).toBe('lapse') })
})

describe('helpers', () => {
  it('formats clocks', () => { expect(formatClock(65)).toBe('01:05'); expect(formatClock(3725)).toBe('1:02:05') })
  it('detects material kinds', () => {
    expect(detectMaterialKind('https://www.youtube.com/watch?v=abc')).toBe('video')
    expect(detectMaterialKind('https://claude.ai/')).toBe('ai')
    expect(detectMaterialKind('https://leetcode.com/problems/lru-cache/')).toBe('practice')
    expect(detectMaterialKind('https://x.org/notes.pdf')).toBe('pdf')
  })
  it('validates urls and adds https', () => { expect(isValidUrl(normalizeUrl('sqlzoo.net'))).toBe(true); expect(isValidUrl('not a url')).toBe(false) })
  it('builds an embed only for youtube links', () => {
    expect(toEmbed('https://youtu.be/dQw4w9WgXcQ')).toContain('youtube-nocookie.com/embed/dQw4w9WgXcQ')
    expect(toEmbed('https://example.com/song')).toBeNull()
  })
})
