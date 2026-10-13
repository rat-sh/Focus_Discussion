import type { QualityState } from '@/domain/types'
import type { AttentionEngine, AttentionSample } from './types'

/** Demo engine. Walks through plausible states so every colour can be reviewed. Replaced by the on-device engine later. */
export class MockAttentionEngine implements AttentionEngine {
  readonly name = 'mock'
  private timer: ReturnType<typeof setInterval> | null = null
  private listeners = new Set<(s: AttentionSample) => void>()
  private current: QualityState = 'focused'
  private forced: QualityState | null = null
  private holdLeft = 12

  async start() {
    this.stop()
    this.timer = setInterval(() => this.tick(), 1000)
  }
  stop() { if (this.timer) clearInterval(this.timer); this.timer = null }
  onSample(cb: (s: AttentionSample) => void) { this.listeners.add(cb); return () => { this.listeners.delete(cb) } }
  onError() { return () => undefined }
  force(state: QualityState | null) { this.forced = state; if (state) this.emit(state) }

  private tick() {
    if (this.forced) { this.emit(this.forced); return }
    if (--this.holdLeft <= 0) {
      const r = Math.random()
      this.current = this.current !== 'focused' ? 'focused' : r < 0.06 ? 'phone' : r < 0.1 ? 'lapse' : 'focused'
      this.holdLeft = this.current === 'focused' ? 20 + Math.floor(Math.random() * 40) : 4 + Math.floor(Math.random() * 6)
    }
    this.emit(this.current)
  }
  private emit(state: QualityState) { const s = { state, at: Date.now() }; this.listeners.forEach((l) => l(s)) }
}
