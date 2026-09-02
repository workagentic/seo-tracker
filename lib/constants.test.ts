import { describe, it, expect } from 'vitest'
import { getCalendarQuarter, getCalendarQuarterLabel, getCurrentQuarter } from './constants'

describe('getCalendarQuarter', () => {
  it('computes standard calendar quarters for any month', () => {
    expect(getCalendarQuarter(new Date('2026-01-15'))).toEqual({ quarterNumber: 1, year: 2026 })
    expect(getCalendarQuarter(new Date('2026-04-01'))).toEqual({ quarterNumber: 2, year: 2026 })
    expect(getCalendarQuarter(new Date('2026-07-01'))).toEqual({ quarterNumber: 3, year: 2026 })
    expect(getCalendarQuarter(new Date('2026-10-01'))).toEqual({ quarterNumber: 4, year: 2026 })
    expect(getCalendarQuarter(new Date('2026-12-31'))).toEqual({ quarterNumber: 4, year: 2026 })
  })

  it('recurs across years rather than needing manually-extended boundaries', () => {
    expect(getCalendarQuarter(new Date('2027-08-15'))).toEqual({ quarterNumber: 3, year: 2027 })
    expect(getCalendarQuarter(new Date('2030-02-01'))).toEqual({ quarterNumber: 1, year: 2030 })
  })
})

describe('getCalendarQuarterLabel', () => {
  it('returns the bare label with no year, matching tasks.quarter', () => {
    expect(getCalendarQuarterLabel(new Date('2026-09-01'))).toBe('Q3')
    expect(getCalendarQuarterLabel(new Date('2027-09-01'))).toBe('Q3')
  })
})

describe('getCurrentQuarter', () => {
  it('returns the year-qualified key matching quarterly_targets.quarter_key', () => {
    // Programme kickoff (24 Aug 2026) through the end of the September sprint (30 Sep 2026)
    // both fall in calendar Q3 2026 -- the old fixed 'Q1' programme-quarter label for this
    // exact window is now 'Q3-2026' (CLAUDE.md Section 14 Phase 1).
    expect(getCurrentQuarter(new Date('2026-08-24'))).toBe('Q3-2026')
    expect(getCurrentQuarter(new Date('2026-09-01'))).toBe('Q3-2026')
    expect(getCurrentQuarter(new Date('2026-09-30'))).toBe('Q3-2026')
  })

  it('distinguishes the same quarter number across different years', () => {
    expect(getCurrentQuarter(new Date('2026-10-01'))).toBe('Q4-2026')
    expect(getCurrentQuarter(new Date('2027-01-01'))).toBe('Q1-2027')
    expect(getCurrentQuarter(new Date('2027-07-01'))).toBe('Q3-2027')
    expect(getCurrentQuarter(new Date('2028-07-01'))).toBe('Q3-2028')
  })
})
