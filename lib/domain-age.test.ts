import { describe, it, expect } from 'vitest'
import { formatDomainAge } from './domain-age'

const NOW = new Date('2026-09-23T00:00:00Z')

describe('formatDomainAge', () => {
  it('returns an em dash for null', () => {
    expect(formatDomainAge(null, NOW)).toBe('—')
  })

  it('returns an em dash for an unparseable date', () => {
    expect(formatDomainAge('not-a-date', NOW)).toBe('—')
  })

  it('returns an em dash for a creation date in the future', () => {
    expect(formatDomainAge('2027-01-01', NOW)).toBe('—')
  })

  it('returns "<1m" for a domain created this same day', () => {
    expect(formatDomainAge('2026-09-23', NOW)).toBe('<1m')
  })

  it('returns whole months for a domain under a year old', () => {
    expect(formatDomainAge('2026-03-23', NOW)).toBe('6m')
  })

  it('returns whole years with no month remainder', () => {
    expect(formatDomainAge('2014-09-23', NOW)).toBe('12y')
  })

  it('returns years and months', () => {
    expect(formatDomainAge('2014-06-10', NOW)).toBe('12y 3m')
  })

  it('rolls back a year when the anniversary day this month hasn\'t happened yet', () => {
    // created on the 30th; "now" is the 23rd -- this month's anniversary hasn't occurred
    expect(formatDomainAge('2020-08-30', NOW)).toBe('6y')
  })
})
