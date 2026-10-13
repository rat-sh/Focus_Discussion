import { describe, expect, it } from 'vitest'
import { DWELL_THRESHOLDS_SECONDS, THRESHOLDS } from '../classify'

describe('focus dwell thresholds', () => {
  it('uses documented thresholds measured in seconds', () => {
    expect(DWELL_THRESHOLDS_SECONDS).toEqual({
      noFaceSec: 5,
      eyesClosedSec: 10,
      lookAwaySec: 30,
      phoneSec: 3,
    })
    expect(THRESHOLDS).toMatchObject(DWELL_THRESHOLDS_SECONDS)
  })
})
