import { describe, it, expect } from 'vitest'
import { compareToEA } from './competitors'
import type { Competitor, MetricSnapshot } from '@/types'

function makeCompetitor(overrides: Partial<Competitor>): Competitor {
  return {
    id: 'c1',
    company_name: 'Rival Co',
    domain: 'rival.com',
    domain_rating: null,
    organic_traffic: null,
    organic_keywords: null,
    keywords_top_3: null,
    est_traffic_value: null,
    referring_domains: null,
    last_synced_at: null,
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function makeSnapshot(overrides: Partial<MetricSnapshot>): MetricSnapshot {
  return {
    id: 's1',
    snapshot_date: '2026-08-01',
    quarter_label: 'Q1',
    notes: null,
    created_by: null,
    created_at: '2026-08-01T00:00:00.000Z',
    domain_rating: null,
    organic_traffic_global: null,
    organic_traffic_us: null,
    organic_keywords_global: null,
    organic_keywords_us: null,
    keywords_top_3: null,
    keywords_top_10: null,
    traffic_value_monthly: null,
    referring_domains_total: null,
    referring_domains_quality: null,
    avg_keywords_per_page: null,
    indexed_content_pages: null,
    ...overrides,
  }
}

describe('compareToEA', () => {
  it('marks EA as "down" (behind) when a competitor is ahead, with a negative delta', () => {
    // EA=25, competitor=40 (ahead of EA) — EA is 60% below this competitor on DR.
    const competitor = makeCompetitor({ domain_rating: 40 })
    const snapshot = makeSnapshot({ domain_rating: 25 })

    const [dr] = compareToEA(competitor, snapshot)

    expect(dr).toEqual({ key: 'domain_rating', label: 'DR', eaValue: 25, competitorValue: 40, deltaPct: -60, direction: 'down' })
  })

  it('marks EA as "up" (ahead) when a competitor is behind, with a positive delta', () => {
    // EA=25, competitor=10 (behind EA) — EA is 60% above this competitor on DR.
    const competitor = makeCompetitor({ domain_rating: 10 })
    const snapshot = makeSnapshot({ domain_rating: 25 })

    const [dr] = compareToEA(competitor, snapshot)

    expect(dr.direction).toBe('up')
    expect(dr.deltaPct).toBe(60)
  })

  it('marks equal values as "equal" with a zero delta', () => {
    const competitor = makeCompetitor({ domain_rating: 25 })
    const snapshot = makeSnapshot({ domain_rating: 25 })

    const [dr] = compareToEA(competitor, snapshot)

    expect(dr.direction).toBe('equal')
    expect(dr.deltaPct).toBe(0)
  })

  it('returns no-data when EA has no snapshot yet', () => {
    const competitor = makeCompetitor({ domain_rating: 40 })

    const [dr] = compareToEA(competitor, null)

    expect(dr).toEqual({ key: 'domain_rating', label: 'DR', eaValue: null, competitorValue: 40, deltaPct: null, direction: 'no-data' })
  })

  it('returns no-data when the competitor is missing that metric', () => {
    const competitor = makeCompetitor({ domain_rating: null })
    const snapshot = makeSnapshot({ domain_rating: 25 })

    const [dr] = compareToEA(competitor, snapshot)

    expect(dr.direction).toBe('no-data')
  })

  it('avoids dividing by zero when EA value is 0, marking EA as behind', () => {
    const competitor = makeCompetitor({ referring_domains: 5 })
    const snapshot = makeSnapshot({ referring_domains_total: 0 })

    const comparison = compareToEA(competitor, snapshot).find((c) => c.key === 'referring_domains')

    expect(comparison).toEqual({ key: 'referring_domains', label: 'Ref. Domains', eaValue: 0, competitorValue: 5, deltaPct: null, direction: 'down' })
  })

  it('covers all six comparison metrics', () => {
    const competitor = makeCompetitor({})
    const result = compareToEA(competitor, null)
    expect(result.map((r) => r.key)).toEqual([
      'domain_rating',
      'organic_traffic',
      'organic_keywords',
      'keywords_top_3',
      'est_traffic_value',
      'referring_domains',
    ])
  })
})
