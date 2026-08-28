import { describe, it, expect } from 'vitest'
import { matchTrackedKeywords } from './match'
import type { TrackedKeyword } from '@/types'
import type { GscQueryRow } from './client'

function makeKeyword(overrides: Partial<TrackedKeyword>): TrackedKeyword {
  return {
    id: 'kw-1',
    keyword: 'test keyword',
    priority: 'high',
    category: 'commercial',
    target_url: null,
    monthly_volume: null,
    keyword_difficulty: null,
    cpc: null,
    current_position: null,
    previous_position: null,
    position_updated_at: null,
    notes: null,
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function makeRow(overrides: Partial<GscQueryRow>): GscQueryRow {
  return {
    query: 'test keyword',
    page: 'https://expertiseaccelerated.com/',
    position: 10,
    clicks: 1,
    impressions: 10,
    ctr: 0.1,
    ...overrides,
  }
}

describe('matchTrackedKeywords', () => {
  it('matches a keyword to its GSC row case-insensitively', () => {
    const keyword = makeKeyword({ keyword: 'Best CPA Firm' })
    const row = makeRow({ query: 'best cpa firm', position: 7.2 })

    const matches = matchTrackedKeywords([keyword], [row])

    expect(matches).toEqual([{ keyword, position: 7.2, page: row.page }])
  })

  it('picks the best (lowest) position when a query appears on multiple pages', () => {
    const keyword = makeKeyword({ keyword: 'fractional cfo' })
    const rows = [
      makeRow({ query: 'fractional cfo', page: 'https://expertiseaccelerated.com/blog/', position: 15 }),
      makeRow({ query: 'fractional cfo', page: 'https://expertiseaccelerated.com/fractional-cfo-services/', position: 6 }),
    ]

    const matches = matchTrackedKeywords([keyword], rows)

    expect(matches).toEqual([
      { keyword, position: 6, page: 'https://expertiseaccelerated.com/fractional-cfo-services/' },
    ])
  })

  it('omits keywords with no matching GSC row', () => {
    const keyword = makeKeyword({ keyword: 'no data for this one' })
    const matches = matchTrackedKeywords([keyword], [makeRow({ query: 'something else' })])
    expect(matches).toEqual([])
  })

  it('ignores leading/trailing whitespace when matching', () => {
    const keyword = makeKeyword({ keyword: '  spaced keyword ' })
    const row = makeRow({ query: 'spaced keyword' })
    const matches = matchTrackedKeywords([keyword], [row])
    expect(matches).toHaveLength(1)
  })
})
