import { describe, it, expect } from 'vitest'
import { calculateRAG } from './rag'

describe('calculateRAG', () => {
  it('returns no-data when actual is null', () => {
    expect(calculateRAG(null, 100)).toBe('no-data')
  })
  it('returns green at or above 95% of target', () => {
    expect(calculateRAG(95, 100)).toBe('green')
    expect(calculateRAG(120, 100)).toBe('green')
  })
  it('returns amber between 80% and 94% of target', () => {
    expect(calculateRAG(80, 100)).toBe('amber')
    expect(calculateRAG(94, 100)).toBe('amber')
  })
  it('returns red below 80% of target', () => {
    expect(calculateRAG(79, 100)).toBe('red')
    expect(calculateRAG(0, 100)).toBe('red')
  })
})
