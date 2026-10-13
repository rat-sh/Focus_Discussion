import type { AttentionEngine } from './types'
import { MockAttentionEngine } from './mockEngine'

export async function createAttentionEngine(mock: boolean): Promise<AttentionEngine> {
  if (mock) return new MockAttentionEngine()
  const { MediaPipeAttentionEngine } = await import('./mediapipeEngine')
  return new MediaPipeAttentionEngine()
}

export type { AttentionEngine, AttentionSample, Signals } from './types'
