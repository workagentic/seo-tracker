import { describe, it, expect } from 'vitest'
import { computeGscScorecardMetrics } from './scorecard'
import type { GscQueryRow } from './client'

function makeRow(overrides: Partial<GscQueryRow>): GscQueryRow {
  return {
    query: 'test query',
    page: 'https://example.com/page',
    position: 5,
    clicks: 1,
    impressions: 10,
    ctr: 0.1,
    ...overrides,
  }
}

describe('computeGscScorecardMetrics', () => {
  it('sums clicks across all rows for traffic', () => {
    const rows = [makeRow({ clicks: 10 }), makeRow({ clicks: 5, query: 'other' })]
    expect(computeGscScorecardMetrics(rows).trafficSum).toBe(15)
  })

  it('counts each distinct query once even across multiple pages', () => {
    const rows = [
      makeRow({ query: 'accounting software', page: '/a', position: 4 }),
      makeRow({ query: 'accounting software', page: '/b', position: 8 }),
    ]
    expect(computeGscScorecardMetrics(rows).keywordCount).toBe(1)
  })

  it('uses the best (lowest) position across pages for a query', () => {
    const rows = [
      makeRow({ query: 'cpa cost', page: '/a', position: 12 }),
      makeRow({ query: 'cpa cost', page: '/b', position: 2 }),
    ]
    const metrics = computeGscScorecardMetrics(rows)
    expect(metrics.keywordsTop3).toBe(1)
  })

  it('ignores a query/page row with zero clicks and zero impressions', () => {
    const rows = [makeRow({ query: 'dead query', clicks: 0, impressions: 0 })]
    const metrics = computeGscScorecardMetrics(rows)
    expect(metrics.keywordCount).toBe(0)
    expect(metrics.indexedPages).toBe(0)
  })

  it('buckets top3 and top10 correctly at the boundaries', () => {
    const rows = [
      makeRow({ query: 'q1', position: 3 }),
      makeRow({ query: 'q2', position: 4 }),
      makeRow({ query: 'q3', position: 10 }),
      makeRow({ query: 'q4', position: 11 }),
    ]
    const metrics = computeGscScorecardMetrics(rows)
    expect(metrics.keywordsTop3).toBe(1)
    expect(metrics.keywordsTop10).toBe(3)
  })

  it('counts distinct pages with signal for indexed_content_pages', () => {
    const rows = [
      makeRow({ page: '/a', query: 'q1' }),
      makeRow({ page: '/a', query: 'q2' }),
      makeRow({ page: '/b', query: 'q3' }),
    ]
    expect(computeGscScorecardMetrics(rows).indexedPages).toBe(2)
  })

  it('returns all zeros for an empty result set', () => {
    expect(computeGscScorecardMetrics([])).toEqual({
      trafficSum: 0, keywordCount: 0, keywordsTop3: 0, keywordsTop10: 0, indexedPages: 0,
    })
  })
})
