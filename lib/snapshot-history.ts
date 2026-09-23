import type { MetricSnapshot, CompetitorSnapshot, MetricKey } from '@/types'

export const HISTORY_METRIC_FIELDS: { key: MetricKey; label: string }[] = [
  { key: 'domain_rating', label: 'Domain Rating' },
  { key: 'organic_traffic_global', label: 'Organic Traffic (Global)' },
  { key: 'organic_traffic_us', label: 'Organic Traffic (US)' },
  { key: 'organic_keywords_global', label: 'Organic Keywords (Global)' },
  { key: 'organic_keywords_us', label: 'Organic Keywords (US)' },
  { key: 'keywords_top_3', label: 'Keywords Top 3' },
  { key: 'keywords_top_10', label: 'Keywords Top 10' },
  { key: 'traffic_value_monthly', label: 'Est. Traffic Value' },
  { key: 'referring_domains_total', label: 'Referring Domains (Total)' },
  { key: 'referring_domains_quality', label: 'Quality Ref. Domains' },
  { key: 'avg_keywords_per_page', label: 'Avg. Keywords / Page' },
  { key: 'indexed_content_pages', label: 'Indexed Content Pages' },
]

// The Monday (ISO week start) that `dateStr` (a 'YYYY-MM-DD' snapshot_date) falls in, as a
// 'YYYY-MM-DD' string. UTC throughout so this doesn't shift by timezone.
export function mondayOf(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`)
  const day = d.getUTCDay() // 0 = Sunday .. 6 = Saturday
  const diffToMonday = day === 0 ? -6 : 1 - day
  d.setUTCDate(d.getUTCDate() + diffToMonday)
  return d.toISOString().slice(0, 10)
}

// Snapshots now get written on every sync (manual or cron), not just once a week, so raw
// snapshot_date history reads as a cluttered near-daily feed instead of the weekly view this
// was designed for. Group by the Monday-starting week instead -- one entry per week, the most
// recent snapshot within that week (input is oldest-first, so a later same-week snapshot
// overwrites an earlier one) -- and pair each week with the prior week's representative
// snapshot for the delta, not just whatever the previous individual row happened to be.
function groupByWeek<T extends { snapshot_date: string }>(
  snapshotsOldestFirst: T[]
): { weekStart: string; snapshot: T }[] {
  const byWeek = new Map<string, T>()
  for (const snapshot of snapshotsOldestFirst) {
    byWeek.set(mondayOf(snapshot.snapshot_date), snapshot)
  }
  return Array.from(byWeek.entries())
    .map(([weekStart, snapshot]) => ({ weekStart, snapshot }))
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart))
}

export interface MetricHistoryEntry {
  weekStart: string
  snapshot: MetricSnapshot
  previous: MetricSnapshot | null
}

// Dashboard's weekly-snapshot scrollable feed (CLAUDE.md Section 14 Phase 6) -- one card per
// Monday-starting week, newest first, each paired with the representative snapshot of the
// week immediately before it for a week-over-week delta.
export function buildMetricHistory(snapshotsOldestFirst: MetricSnapshot[]): MetricHistoryEntry[] {
  const weeks = groupByWeek(snapshotsOldestFirst)
  const entries = weeks.map((w, i) => ({
    weekStart: w.weekStart,
    snapshot: w.snapshot,
    previous: i > 0 ? weeks[i - 1].snapshot : null,
  }))
  return entries.reverse()
}

export type CompetitorMetricKey =
  | 'domain_rating'
  | 'organic_traffic'
  | 'organic_keywords'
  | 'keywords_top_3'
  | 'est_traffic_value'
  | 'referring_domains'

export const COMPETITOR_HISTORY_FIELDS: { key: CompetitorMetricKey; label: string }[] = [
  { key: 'domain_rating', label: 'Domain Rating' },
  { key: 'organic_traffic', label: 'Organic Traffic' },
  { key: 'organic_keywords', label: 'Organic Keywords' },
  { key: 'keywords_top_3', label: 'Keywords Top 3' },
  { key: 'est_traffic_value', label: 'Est. Traffic Value' },
  { key: 'referring_domains', label: 'Referring Domains' },
]

export interface CompetitorHistoryEntry {
  weekStart: string
  snapshot: CompetitorSnapshot
  previous: CompetitorSnapshot | null
}

export function buildCompetitorHistory(snapshotsOldestFirst: CompetitorSnapshot[]): CompetitorHistoryEntry[] {
  const weeks = groupByWeek(snapshotsOldestFirst)
  const entries = weeks.map((w, i) => ({
    weekStart: w.weekStart,
    snapshot: w.snapshot,
    previous: i > 0 ? weeks[i - 1].snapshot : null,
  }))
  return entries.reverse()
}
