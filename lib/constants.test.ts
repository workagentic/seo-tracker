import { describe, it, expect } from 'vitest'
import { getCurrentQuarter, QUARTER_BOUNDARIES } from './constants'

describe('getCurrentQuarter', () => {
  it('returns Q1 for a date inside the Q1 window', () => {
    expect(getCurrentQuarter(new Date('2026-09-01'))).toBe('Q1')
  })
  it('returns Q2 for a date inside the Q2 window', () => {
    expect(getCurrentQuarter(new Date('2026-11-15'))).toBe('Q2')
  })
  it('returns the last quarter label when past all boundaries', () => {
    expect(getCurrentQuarter(new Date('2028-01-01'))).toBe(
      QUARTER_BOUNDARIES[QUARTER_BOUNDARIES.length - 1].label
    )
  })
})
