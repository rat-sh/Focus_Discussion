import type { QualityState } from '@/domain/types'

/** Raw signals one detector pass can produce. All values are computed on the device. */
export interface Signals {
  faceCount: number
  /** 0..1, average of both eyes' blink blendshapes. 1 = fully closed. */
  eyesClosed: number
  /** head rotation in degrees, 0 = facing the screen */
  yawDeg: number
  pitchDeg: number
  /** a phone-like object is in frame */
  phoneVisible: boolean
}

export interface AttentionSample { state: QualityState; at: number }

/**
 * The only thing the UI knows about face tracking.
 * Implementations: MockAttentionEngine (demo) and MediaPipeAttentionEngine (live).
 */
export interface AttentionEngine {
  readonly name: string
  start(stream: MediaStream | null): Promise<void>
  stop(): void
  onSample(cb: (s: AttentionSample) => void): () => void
  onError(cb: (error: Error) => void): () => void
  /** Demo only. Pass null to return to automatic behaviour. */
  force?(state: QualityState | null): void
}
