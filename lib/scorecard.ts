import { calculateRAG } from '@/lib/rag'
import { ACCOUNTABILITY_MAP } from '@/lib/constants'
import type { MetricKey, MetricSnapshot, QuarterTarget, RAGStatus } from '@/types'

export const SCORECARD_ROWS: { key: MetricKey; label: string }[] = [
  { key: 'domain_rating', label: 'Domain Rating' },
  { key: 'organic_traffic_global', label: 'Organic Traffic / mo (Global)' },
  { key: 'organic_traffic_us', label: 'Organic Traffic / mo (US)' },
  { key: 'organic_keywords_global', label: 'Organic Keywords (Global)' },
  { key: 'organic_keywords_us', label: 'Organic Keywords (US)' },
  { key: 'keywords_top_3', label: 'Keywords Ranked #1–3' },
  { key: 'keywords_top_10', label: 'Keywords in Top 10' },
  { key: 'traffic_value_monthly', label: 'Est. Traffic Value / mo' },
  { key: 'referring_domains_total', label: 'Referring Domains (Total)' },
  { key: 'referring_domains_quality', label: 'Quality Ref. Domains (DR30+, dofollow)' },
  { key: 'avg_keywords_per_page', label: 'Avg. Keywords per Ranking Page' },
  { key: 'indexed_content_pages', label: 'Live Indexed Content Pages' },
]

export interface ScorecardRow {
  key: MetricKey
  label: string
  target: number
  actual: number | null
  variance: number | null
  variancePct: number | null
  ragStatus: RAGStatus
  owners: string[]
}

export function buildScorecardRows(snapshot: MetricSnapshot | null, target: QuarterTarget): ScorecardRow[] {
  return SCORECARD_ROWS.map((row) => {
    const actual = snapshot?.[row.key] ?? null
    const targetValue = target[row.key]
    return {
      key: row.key,
      label: row.label,
      target: targetValue,
      actual,
      variance: actual !== null ? actual - targetValue : null,
      variancePct: actual !== null ? ((actual - targetValue) / targetValue) * 100 : null,
      ragStatus: calculateRAG(actual, targetValue),
      owners: ACCOUNTABILITY_MAP[row.key] ?? [],
    }
  })
}

function csvCell(value: string | number | null): string {
  if (value === null) return ''
  const str = String(value)
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
}

export function scorecardRowsToCsv(rows: ScorecardRow[], quarterLabel: string): string {
  const header = ['Critical Statistic', 'Target', 'Actual', 'Variance', 'Variance %', 'RAG Status', 'Accountable Owner']
  const lines = [
    `Scorecard — ${quarterLabel}`,
    header.map(csvCell).join(','),
    ...rows.map((r) =>
      [
        r.label,
        r.target,
        r.actual,
        r.variance,
        r.variancePct !== null ? r.variancePct.toFixed(1) : null,
        r.ragStatus,
        r.owners.join('; '),
      ]
        .map(csvCell)
        .join(',')
    ),
  ]
  return lines.join('\n')
}
