import type { LiveWhiteboardStroke } from './liveApi'

export function whiteboardSvg(strokes: LiveWhiteboardStroke[]): string {
  const lines = strokes.map((stroke) => {
    const points = stroke.points.map(({ x, y }) => `${x},${y}`).join(' ')
    return `<polyline points="${points}" fill="none" stroke="${stroke.color}" stroke-width="${stroke.width}" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>`
  }).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 600" role="img" aria-label="Focus Lock shared board"><rect width="1000" height="600" fill="white"/>${lines}</svg>`
}

export function downloadWhiteboardSvg(roomId: string, strokes: LiveWhiteboardStroke[]): void {
  const blob = new Blob([whiteboardSvg(strokes)], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `focus-lock-board-${roomId.slice(0, 8)}.svg`
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
