import { describe, expect, test } from 'bun:test'
import { LIMITS } from '../src/middleware/limits'

describe('room rate limits', () => {
  test('room join and token limits allow a 20-person burst from one IP', () => {
    expect(LIMITS['room.join.ip'].burst).toBeGreaterThanOrEqual(20)
    expect(LIMITS['room.token'].burst).toBeGreaterThanOrEqual(20)
  })
})
