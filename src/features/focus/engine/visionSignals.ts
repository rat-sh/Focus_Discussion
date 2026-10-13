import type { FaceLandmarkerResult, ObjectDetectorResult } from '@mediapipe/tasks-vision'
import type { Signals } from './types'

const degrees = 180 / Math.PI

export function signalsFromResults(face: FaceLandmarkerResult, objects: ObjectDetectorResult): Signals {
  const blendshapes = face.faceBlendshapes[0]?.categories ?? []
  const leftBlink = blendshapes.find((item) => item.categoryName === 'eyeBlinkLeft')?.score ?? 0
  const rightBlink = blendshapes.find((item) => item.categoryName === 'eyeBlinkRight')?.score ?? 0
  const matrix = face.facialTransformationMatrixes[0]?.data
  const yawDeg = matrix && matrix.length >= 11 ? Math.atan2(matrix[8] ?? 0, matrix[10] ?? 1) * degrees : 0
  const rawPitchDeg = matrix && matrix.length >= 10
    ? Math.asin(Math.max(-1, Math.min(1, -(matrix[9] ?? 0)))) * degrees
    : 0
  const pitchDeg = Object.is(rawPitchDeg, -0) ? 0 : rawPitchDeg
  const phoneVisible = objects.detections.some((detection) =>
    detection.categories.some((category) =>
      (category.categoryName || category.displayName).toLowerCase() === 'cell phone' && category.score >= 0.35,
    ),
  )

  return {
    faceCount: face.faceLandmarks.length,
    eyesClosed: (leftBlink + rightBlink) / 2,
    yawDeg,
    pitchDeg,
    phoneVisible,
  }
}
