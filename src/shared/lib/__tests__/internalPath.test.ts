import { describe, expect, it } from 'vitest'
import { safeInternalPath } from '../internalPath'

describe('safe internal paths', () => {
  it('keeps same-origin route, query, and fragment', () => {
    expect(safeInternalPath('/j/AB12?source=email#details')).toBe('/j/AB12?source=email#details')
  })

  it('rejects external and malformed destinations', () => {
    expect(safeInternalPath('https://example.com/')).toBe('/')
    expect(safeInternalPath('//example.com/')).toBe('/')
    expect(safeInternalPath(undefined)).toBe('/')
  })
})
