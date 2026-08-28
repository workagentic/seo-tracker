import { describe, it, expect } from 'vitest'
import { buildKpiList, buildMetricsMoved, buildKeywordMovers, getWeekRange } from './weekly-report'
import type { MetricSnapshot, QuarterTarget, TrackedKeyword } from '@/types'

function makeSnapshot(overrides: Partial<MetricSnapshot>): MetricSnapshot {
  return {
    id: 's1',
    snapshot_date: '2026-08-25',
    quarter_label: 'Q1',
    notes: null,
    created_by: null,
    created_at: '2026-08-25T00:00:00.000Z',
    domain_rating: 25,
    organic_traffic_global: 500,
    organic_traffic_us: 450,
    organic_keywords_global: 200,
    organic_keywords_us: 150,
    keywords_top_3: 30,
    keywords_top_10: 150,
    traffic_value_monthly: 2500,
    referring_domains_total: 900,
    referring_domains_quality: 70,
    avg_keywords_per_page: 4,
    indexed_content_pages: 55,
    ...overrides,
  }
}

const TARGET: QuarterTarget = {
  label: 'Q1', date: '2026-09-30', domain_rating: 25,
  organic_traffic_global: 520, organic_traffic_us: 480,
  organic_keywords_global: 240, organic_keywords_us: 190,
  keywords_top_3: 34, keywords_top_10: 189, traffic_value_monthly: 2900,
  referring_domains_total: 900, referring_domains_quality: 75,
  avg_keywords_per_page: 4, indexed_content_pages: 60,
}

function makeKeyword(overrides: Partial<TrackedKeyword>): TrackedKeyword {
  return {
    id: 'k1', keyword: 'test keyword', priority: 'high', category: 'commercial',
    target_url: null, monthly_volume: null, keyword_difficulty: null, cpc: null,
    current_position: null, previous_position: null, position_updated_at: null,
    notes: null, is_active: true, created_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('buildKpiList', () => {
  it('maps all 12 KPI fields with RAG status', () => {
    const list = buildKpiList(makeSnapshot({}), TARGET)
    expect(list).toHaveLength(12)
    const dr = list.find((k) => k.key === 'domain_rating')
    expect(dr).toEqual({ key: 'domain_rating', label: 'Domain Rating', actual: 25, target: 25, ragStatus: 'green' })
  })

  it('returns no-data RAG status when there is no snapshot yet', () => {
    const list = buildKpiList(null, TARGET)
    expect(list.every((k) => k.ragStatus === 'no-data')).toBe(true)
    expect(list.every((k) => k.actual === null)).toBe(true)
  })
})

describe('buildMetricsMoved', () => {
  it('returns an empty list when there is no previous snapshot', () => {
    expect(buildMetricsMoved(null, makeSnapshot({}))).toEqual([])
  })

  it('only includes metrics that actually changed', () => {
    const previous = makeSnapshot({ domain_rating: 24, organic_traffic_global: 500 })
    const current = makeSnapshot({ domain_rating: 25, organic_traffic_global: 500 })

    const moves = buildMetricsMoved(previous, current)

    expect(moves).toHaveLength(1)
    expect(moves[0]).toEqual({ key: 'domain_rating', label: 'Domain Rating', previous: 24, current: 25, deltaPct: (1 / 24) * 100 })
  })

  it('handles a zero previous value without dividing by zero', () => {
    const previous = makeSnapshot({ referring_domains_quality: 0 })
    const current = makeSnapshot({ referring_domains_quality: 5 })

    const moves = buildMetricsMoved(previous, current)

    const move = moves.find((m) => m.key === 'referring_domains_quality')
    expect(move).toEqual({ key: 'referring_domains_quality', label: 'Quality Ref. Domains', previous: 0, current: 5, deltaPct: null })
  })
})

describe('buildKeywordMovers', () => {
  it('returns risers and fallers sorted by magnitude, excluding unchanged keywords', () => {
    const keywords = [
      makeKeyword({ keyword: 'big riser', previous_position: 20, current_position: 5 }),
      makeKeyword({ keyword: 'small riser', previous_position: 10, current_position: 8 }),
      makeKeyword({ keyword: 'unchanged', previous_position: 10, current_position: 10 }),
      makeKeyword({ keyword: 'big faller', previous_position: 5, current_position: 25 }),
      makeKeyword({ keyword: 'no data', previous_position: null, current_position: null }),
    ]

    const movers = buildKeywordMovers(keywords)

    expect(movers.map((m) => m.keyword)).toEqual(['big riser', 'small riser', 'big faller'])
    expect(movers.find((m) => m.keyword === 'big riser')?.change).toBe(15)
    expect(movers.find((m) => m.keyword === 'big faller')?.change).toBe(-20)
  })

  it('deduplicates a keyword that appears in both the riser and faller lists', () => {
    const keywords = [makeKeyword({ keyword: 'only one', previous_position: 10, current_position: 3 })]
    const movers = buildKeywordMovers(keywords)
    expect(movers).toHaveLength(1)
  })
})

describe('getWeekRange', () => {
  it('returns Monday-Sunday for a mid-week date', () => {
    // 2026-08-27 is a Thursday
    const range = getWeekRange(new Date('2026-08-27T12:00:00.000Z'))
    expect(range).toEqual({ weekStart: '2026-08-24', weekEnd: '2026-08-30' })
  })

  it('returns the correct week when the date is a Sunday', () => {
    const range = getWeekRange(new Date('2026-08-30T12:00:00.000Z'))
    expect(range).toEqual({ weekStart: '2026-08-24', weekEnd: '2026-08-30' })
  })

  it('returns the correct week when the date is a Monday', () => {
    const range = getWeekRange(new Date('2026-08-31T12:00:00.000Z'))
    expect(range).toEqual({ weekStart: '2026-08-31', weekEnd: '2026-09-06' })
  })
})
