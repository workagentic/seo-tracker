import type { GscQueryRow } from './client'

export interface GscScorecardMetrics {
  trafficSum: number
  keywordCount: number
  keywordsTop3: number
  keywordsTop10: number
  indexedPages: number
}

// Aggregates a raw searchAnalytics.query (dimensions=['query','page']) result into the 5
// Scorecard KPIs the confirmed GSC-first sync priority assigns it (CLAUDE.md Section 14 Phase
// 5): Organic Traffic (sum of clicks), Organic Keywords (distinct queries with any
// clicks/impressions), Keywords Top 3/Top 10 (distinct queries whose best position across
// pages is within that band), and Indexed Content Pages -- a proxy (distinct pages with any
// impressions in the window), since this integration has no separate Index Coverage API call.
export function computeGscScorecardMetrics(rows: GscQueryRow[]): GscScorecardMetrics {
  let trafficSum = 0
  const bestPositionByQuery = new Map<string, number>()
  const pages = new Set<string>()

  for (const row of rows) {
    trafficSum += row.clicks
    if (row.clicks > 0 || row.impressions > 0) {
      pages.add(row.page)
      const existing = bestPositionByQuery.get(row.query)
      if (existing === undefined || row.position < existing) bestPositionByQuery.set(row.query, row.position)
    }
  }

  let keywordsTop3 = 0
  let keywordsTop10 = 0
  for (const position of Array.from(bestPositionByQuery.values())) {
    if (position <= 3) keywordsTop3++
    if (position <= 10) keywordsTop10++
  }

  return {
    trafficSum: Math.round(trafficSum),
    keywordCount: bestPositionByQuery.size,
    keywordsTop3,
    keywordsTop10,
    indexedPages: pages.size,
  }
}
