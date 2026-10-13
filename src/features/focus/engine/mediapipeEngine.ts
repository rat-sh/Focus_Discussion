import {
  FaceLandmarker,
  FilesetResolver,
  ObjectDetector,
} from '@mediapipe/tasks-vision'
import type { QualityState } from '@/domain/types'
import { classify, freshDwell } from './classify'
import type { AttentionEngine, AttentionSample } from './types'
import { signalsFromResults } from './visionSignals'

const WASM_ROOT = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.0/wasm'
const SAMPLE_INTERVAL_MS = 1000

export class MediaPipeAttentionEngine implements AttentionEngine {
  readonly name = 'mediapipe'
  private timer: ReturnType<typeof setInterval> | null = null
  private video: HTMLVideoElement | null = null
  private faceLandmarker: FaceLandmarker | null = null
  private objectDetector: ObjectDetector | null = null
  private listeners = new Set<(sample: AttentionSample) => void>()
  private errorListeners = new Set<(error: Error) => void>()
  private dwell = freshDwell()
  private lastTimestamp = 0
  private stopped = true

  async start(stream: MediaStream | null): Promise<void> {
    this.stop()
    if (!stream) throw new Error('Camera stream is not available.')
    this.stopped = false

    const video = document.createElement('video')
    video.muted = true
    video.playsInline = true
    video.srcObject = stream
    this.video = video

    try {
      await video.play()
      const vision = await FilesetResolver.forVisionTasks(WASM_ROOT)
      const faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: new URL(`${import.meta.env.BASE_URL}models/face_landmarker.task`, location.href).href,
          delegate: 'CPU',
        },
        runningMode: 'VIDEO',
        numFaces: 1,
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: true,
        minFaceDetectionConfidence: 0.5,
        minFacePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      })
      this.faceLandmarker = faceLandmarker
      const objectDetector = await ObjectDetector.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: new URL(`${import.meta.env.BASE_URL}models/efficientdet_lite0_uint8.tflite`, location.href).href,
          delegate: 'CPU',
        },
        runningMode: 'VIDEO',
        categoryAllowlist: ['cell phone'],
        maxResults: 5,
        scoreThreshold: 0.35,
      })
      this.objectDetector = objectDetector

      if (this.stopped) return
      this.dwell = freshDwell()
      this.timer = setInterval(() => this.sample(), SAMPLE_INTERVAL_MS)
    } catch (cause) {
      this.releaseTasks()
      this.stopVideo()
      throw cause instanceof Error ? cause : new Error('Could not initialize on-device focus tracking.')
    }
  }

  stop(): void {
    this.stopped = true
    if (this.timer !== null) clearInterval(this.timer)
    this.timer = null
    this.releaseTasks()
    this.stopVideo()
  }

  onSample(callback: (sample: AttentionSample) => void): () => void {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }

  onError(callback: (error: Error) => void): () => void {
    this.errorListeners.add(callback)
    return () => this.errorListeners.delete(callback)
  }

  private sample(): void {
    const video = this.video
    const faceLandmarker = this.faceLandmarker
    const objectDetector = this.objectDetector
    if (this.stopped || !video || !faceLandmarker || !objectDetector) return

    if (document.hidden || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      this.dwell = freshDwell()
      this.emit('idle')
      return
    }

    try {
      const timestamp = Math.max(performance.now(), this.lastTimestamp + 1)
      this.lastTimestamp = timestamp
      const face = faceLandmarker.detectForVideo(video, timestamp)
      const objects = objectDetector.detectForVideo(video, timestamp)
      const result = classify(signalsFromResults(face, objects), this.dwell)
      this.dwell = result.dwell
      this.emit(result.state)
    } catch (cause) {
      const error = cause instanceof Error ? cause : new Error('On-device focus tracking stopped unexpectedly.')
      this.stop()
      this.errorListeners.forEach((listener) => listener(error))
    }
  }

  private emit(state: QualityState): void {
    const sample = { state, at: Date.now() }
    this.listeners.forEach((listener) => listener(sample))
  }

  private releaseTasks(): void {
    this.faceLandmarker?.close()
    this.objectDetector?.close()
    this.faceLandmarker = null
    this.objectDetector = null
  }

  private stopVideo(): void {
    if (this.video) {
      this.video.pause()
      this.video.srcObject = null
      this.video = null
    }
  }
}
