import { describe, expect, test } from 'bun:test'
import { isValidStageUrl } from '../src/features/rooms/stageValidation'

describe('study stage URL validation', () => {
  test('accepts safe HTTPS URLs', () => {
    expect(isValidStageUrl('https://www.youtube.com/playlist?list=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf')).toBe(true)
    expect(isValidStageUrl('https://leetcode.com/problems/two-sum/')).toBe(true)
  })

  test('rejects insecure, executable, credentialed, and overlong URLs', () => {
    expect(isValidStageUrl('http://example.com')).toBe(false)
    expect(isValidStageUrl('javascript:alert(1)')).toBe(false)
    expect(isValidStageUrl('https://user:pass@example.com')).toBe(false)
    expect(isValidStageUrl(`https://example.com/${'a'.repeat(2048)}`)).toBe(false)
  })
})
