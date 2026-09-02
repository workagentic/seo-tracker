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

export interface MetricHistoryEntry {
  snapshot: MetricSnapshot
  previous: MetricSnapshot | null
}

// Dashboard's weekly-snapshot scrollable feed (CLAUDE.md Section 14 Phase 6) -- one card per
// metric_snapshots row (the weekly cron is what usually creates these, but this reads
// whatever's there rather than needing a dedicated "is this a weekly snapshot" flag the
// schema doesn't have), newest first, each paired with the row immediately before it
// chronologically for a week-over-week delta.
export function buildMetricHistory(snapshotsOldestFirst: MetricSnapshot[]): MetricHistoryEntry[] {
  const entries = snapshotsOldestFirst.map((snapshot, i) => ({
    snapshot,
    previous: i > 0 ? snapshotsOldestFirst[i - 1] : null,
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
  snapshot: CompetitorSnapshot
  previous: CompetitorSnapshot | null
}

export function buildCompetitorHistory(snapshotsOldestFirst: CompetitorSnapshot[]): CompetitorHistoryEntry[] {
  const entries = snapshotsOldestFirst.map((snapshot, i) => ({
    snapshot,
    previous: i > 0 ? snapshotsOldestFirst[i - 1] : null,
  }))
  return entries.reverse()
}
