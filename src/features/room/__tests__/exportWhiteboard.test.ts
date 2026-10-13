import { describe, expect, it } from 'vitest'
import { whiteboardSvg } from '../exportWhiteboard'

describe('whiteboardSvg', () => {
  it('exports saved strokes as a standalone SVG note', () => {
    const svg = whiteboardSvg([{
      id: 'stroke-1',
      userId: 'user-1',
      color: '#1a73e8',
      width: 4,
      points: [{ x: 20, y: 30 }, { x: 40, y: 60 }],
      at: '2026-01-01T00:00:00.000Z',
    }])

    expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg"')
    expect(svg).toContain('points="20,30 40,60"')
    expect(svg).toContain('stroke="#1a73e8"')
  })
})
