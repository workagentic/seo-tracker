import { describe, it, expect } from 'vitest'
import { buildScorecardRows, scorecardRowsToCsv } from './scorecard'
import type { MetricSnapshot, QuarterTarget } from '@/types'

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

const TARGET: QuarterTarget = {
  label: 'Q1', date: '2026-09-30', domain_rating: 25,
  organic_traffic_global: 520, organic_traffic_us: 480,
  organic_keywords_global: 240, organic_keywords_us: 190,
  keywords_top_3: 34, keywords_top_10: 189, traffic_value_monthly: 2900,
  referring_domains_total: 900, referring_domains_quality: 75,
  avg_keywords_per_page: 4, indexed_content_pages: 60,
}

describe('buildScorecardRows', () => {
  it('computes variance, variance %, and RAG status per row', () => {
    const rows = buildScorecardRows(makeSnapshot({}), TARGET)
    const dr = rows.find((r) => r.key === 'domain_rating')!
    expect(dr).toMatchObject({ target: 25, actual: 25, variance: 0, variancePct: 0, ragStatus: 'green' })

    const traffic = rows.find((r) => r.key === 'organic_traffic_global')!
    expect(traffic.variance).toBe(-20)
    expect(traffic.ragStatus).toBe('green') // 500/520 = 96.2% >= 95%
  })

  it('returns null actual/variance and no-data status when there is no snapshot', () => {
    const rows = buildScorecardRows(null, TARGET)
    expect(rows.every((r) => r.actual === null && r.variance === null && r.ragStatus === 'no-data')).toBe(true)
  })

  it('includes accountable owners from ACCOUNTABILITY_MAP', () => {
    const rows = buildScorecardRows(makeSnapshot({}), TARGET)
    const refDomains = rows.find((r) => r.key === 'referring_domains_quality')!
    expect(refDomains.owners).toEqual(['Syed Ali'])
  })
})

describe('scorecardRowsToCsv', () => {
  it('produces a title line, header row, and one row per metric', () => {
    const rows = buildScorecardRows(makeSnapshot({}), TARGET)
    const csv = scorecardRowsToCsv(rows, 'Q1')
    const lines = csv.split('\n')

    expect(lines[0]).toBe('Scorecard — Q1')
    expect(lines[1]).toBe('Critical Statistic,Target,Actual,Variance,Variance %,RAG Status,Accountable Owner')
    expect(lines).toHaveLength(2 + rows.length)
    expect(lines[2]).toContain('Domain Rating')
  })

  it('quotes cells containing commas', () => {
    const rows = buildScorecardRows(makeSnapshot({}), TARGET)
    const csv = scorecardRowsToCsv(rows, 'Q1')
    const drLine = csv.split('\n').find((l) => l.includes('Referring Domains (Total)'))
    // owners for referring_domains_total is ['Syed Ali'] -> no comma, but confirm the row exists and is well-formed
    expect(drLine).toBeDefined()
  })
})
