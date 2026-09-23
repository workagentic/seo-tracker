import { describe, it, expect } from 'vitest'
import { buildMetricHistory, buildCompetitorHistory, mondayOf } from './snapshot-history'
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

describe('mondayOf', () => {
  it('returns the same date when already a Monday', () => {
    expect(mondayOf('2026-08-24')).toBe('2026-08-24') // a Monday
  })

  it('rolls a mid-week date back to that week\'s Monday', () => {
    expect(mondayOf('2026-08-27')).toBe('2026-08-24') // Thursday -> Monday
  })

  it('rolls a Sunday back to the Monday that started its week', () => {
    expect(mondayOf('2026-08-30')).toBe('2026-08-24') // Sunday -> Monday
  })
})

describe('buildMetricHistory', () => {
  it('returns newest week first', () => {
    const oldest = makeSnapshot({ id: 's1', snapshot_date: '2026-08-03' }) // Monday
    const middle = makeSnapshot({ id: 's2', snapshot_date: '2026-08-10' }) // Monday
    const newest = makeSnapshot({ id: 's3', snapshot_date: '2026-08-17' }) // Monday
    const history = buildMetricHistory([oldest, middle, newest])
    expect(history.map((h) => h.snapshot.id)).toEqual(['s3', 's2', 's1'])
  })

  it('pairs each week with the one immediately before it chronologically', () => {
    const oldest = makeSnapshot({ id: 's1', snapshot_date: '2026-08-03' })
    const newest = makeSnapshot({ id: 's2', snapshot_date: '2026-08-10' })
    const history = buildMetricHistory([oldest, newest])
    expect(history[0]).toEqual({ weekStart: '2026-08-10', snapshot: newest, previous: oldest })
    expect(history[1]).toEqual({ weekStart: '2026-08-03', snapshot: oldest, previous: null })
  })

  it('collapses multiple same-week snapshots into one entry, keeping the most recent', () => {
    const monday = makeSnapshot({ id: 's1', snapshot_date: '2026-08-24' })
    const wednesday = makeSnapshot({ id: 's2', snapshot_date: '2026-08-26' })
    const history = buildMetricHistory([monday, wednesday])
    expect(history).toEqual([{ weekStart: '2026-08-24', snapshot: wednesday, previous: null }])
  })

  it('handles a single snapshot with no previous', () => {
    const only = makeSnapshot({ id: 's1', snapshot_date: '2026-08-24' })
    expect(buildMetricHistory([only])).toEqual([{ weekStart: '2026-08-24', snapshot: only, previous: null }])
  })

  it('handles an empty list', () => {
    expect(buildMetricHistory([])).toEqual([])
  })
})

describe('buildCompetitorHistory', () => {
  it('returns newest week first and pairs with the prior week', () => {
    const oldest = makeCompetitorSnapshot({ id: 'cs1', snapshot_date: '2026-08-03' })
    const newest = makeCompetitorSnapshot({ id: 'cs2', snapshot_date: '2026-08-10' })
    const history = buildCompetitorHistory([oldest, newest])
    expect(history[0]).toEqual({ weekStart: '2026-08-10', snapshot: newest, previous: oldest })
    expect(history[1]).toEqual({ weekStart: '2026-08-03', snapshot: oldest, previous: null })
  })
})
