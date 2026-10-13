import type { FaceLandmarkerResult, ObjectDetectorResult } from '@mediapipe/tasks-vision'
import { describe, expect, it } from 'vitest'
import { signalsFromResults } from '../visionSignals'

const faceResult: FaceLandmarkerResult = {
  faceLandmarks: [[]],
  faceBlendshapes: [{
    headIndex: 0,
    headName: '',
    categories: [
      { categoryName: 'eyeBlinkLeft', displayName: '', index: 0, score: 0.8 },
      { categoryName: 'eyeBlinkRight', displayName: '', index: 1, score: 0.6 },
    ],
  }],
  facialTransformationMatrixes: [{
    rows: 4,
    columns: 4,
    data: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
  }],
}

describe('signalsFromResults', () => {
  it('combines face presence, eye closure, and neutral head pose', () => {
    const signals = signalsFromResults(faceResult, { detections: [] })
    expect(signals).toMatchObject({
      faceCount: 1,
      eyesClosed: 0.7,
      yawDeg: 0,
      pitchDeg: 0,
      phoneVisible: false,
    })
  })

  it('detects the phone class without identifying the person', () => {
    const objects: ObjectDetectorResult = {
      detections: [{
        categories: [{ categoryName: 'cell phone', displayName: 'cell phone', index: 0, score: 0.8 }],
        keypoints: [],
      }],
    }
    expect(signalsFromResults(faceResult, objects).phoneVisible).toBe(true)
  })
})
