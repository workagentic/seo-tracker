import { describe, it, expect } from 'vitest'
import { buildMetricHistory, buildCompetitorHistory } from './snapshot-history'
import type { MetricSnapshot, CompetitorSnapshot } from '@/types'

function makeSnapshot(overrides: Partial<MetricSnapshot>): MetricSnapshot {
  return {
    id: 's1', snapshot_date: '2026-08-25', quarter_label: 'Q1', notes: null,
    created_by: null, created_at: '2026-08-25T00:00:00.000Z',
    domain_rating: 25, organic_traffic_global: 500, organic_traffic_us: 450,
    organic_keywords_global: 200, organic_keywords_us: 150, keywords_top_3: 30,
    keywords_top_10: 150, traffic_value_monthly: 2500, referring_domains_total: 900,
    referring_domains_quality: 70, avg_keywords_per_page: 4, indexed_content_pages: 55,
    ...overrides,
  }
}

function makeCompetitorSnapshot(overrides: Partial<CompetitorSnapshot>): CompetitorSnapshot {
  return {
    id: 'cs1', competitor_id: 'c1', snapshot_date: '2026-08-25',
    domain_rating: 40, organic_traffic: 1000, organic_keywords: 300, keywords_top_3: 50,
    est_traffic_value: 5000, referring_domains: 200, created_at: '2026-08-25T00:00:00.000Z',
    ...overrides,
  }
}

describe('buildMetricHistory', () => {
  it('returns newest first', () => {
    const oldest = makeSnapshot({ id: 's1', snapshot_date: '2026-08-01' })
    const middle = makeSnapshot({ id: 's2', snapshot_date: '2026-08-08' })
    const newest = makeSnapshot({ id: 's3', snapshot_date: '2026-08-15' })
    const history = buildMetricHistory([oldest, middle, newest])
    expect(history.map((h) => h.snapshot.id)).toEqual(['s3', 's2', 's1'])
  })

  it('pairs each snapshot with the one immediately before it chronologically', () => {
    const oldest = makeSnapshot({ id: 's1' })
    const newest = makeSnapshot({ id: 's2' })
    const history = buildMetricHistory([oldest, newest])
    expect(history[0]).toEqual({ snapshot: newest, previous: oldest })
    expect(history[1]).toEqual({ snapshot: oldest, previous: null })
  })

  it('handles a single snapshot with no previous', () => {
    const only = makeSnapshot({ id: 's1' })
    expect(buildMetricHistory([only])).toEqual([{ snapshot: only, previous: null }])
  })

  it('handles an empty list', () => {
    expect(buildMetricHistory([])).toEqual([])
  })
})

describe('buildCompetitorHistory', () => {
  it('returns newest first and pairs with the prior snapshot', () => {
    const oldest = makeCompetitorSnapshot({ id: 'cs1', snapshot_date: '2026-08-01' })
    const newest = makeCompetitorSnapshot({ id: 'cs2', snapshot_date: '2026-08-08' })
    const history = buildCompetitorHistory([oldest, newest])
    expect(history[0]).toEqual({ snapshot: newest, previous: oldest })
    expect(history[1]).toEqual({ snapshot: oldest, previous: null })
  })
})
