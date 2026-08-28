import type { Competitor, MetricSnapshot } from '@/types'

export type ComparisonDirection = 'up' | 'down' | 'equal' | 'no-data'

export interface MetricComparison {
  key: string
  label: string
  eaValue: number | null
  competitorValue: number | null
  deltaPct: number | null
  direction: ComparisonDirection
}

const COMPARISON_METRICS: {
  competitorKey: keyof Competitor
  snapshotKey: keyof MetricSnapshot
  label: string
}[] = [
  { competitorKey: 'domain_rating', snapshotKey: 'domain_rating', label: 'DR' },
  { competitorKey: 'organic_traffic', snapshotKey: 'organic_traffic_global', label: 'Traffic/mo' },
  { competitorKey: 'organic_keywords', snapshotKey: 'organic_keywords_global', label: 'Keywords' },
  { competitorKey: 'keywords_top_3', snapshotKey: 'keywords_top_3', label: '#1–3 Keywords' },
  { competitorKey: 'est_traffic_value', snapshotKey: 'traffic_value_monthly', label: 'Est. Value' },
  { competitorKey: 'referring_domains', snapshotKey: 'referring_domains_total', label: 'Ref. Domains' },
]

export function compareToEA(competitor: Competitor, eaSnapshot: MetricSnapshot | null): MetricComparison[] {
  return COMPARISON_METRICS.map(({ competitorKey, snapshotKey, label }) => {
    const eaValue = eaSnapshot ? ((eaSnapshot[snapshotKey] as number | null) ?? null) : null
    const competitorValue = (competitor[competitorKey] as number | null) ?? null

    if (eaValue === null || competitorValue === null) {
      return { key: competitorKey, label, eaValue, competitorValue, deltaPct: null, direction: 'no-data' }
    }

    if (eaValue === 0) {
      const direction: ComparisonDirection = competitorValue > 0 ? 'up' : 'equal'
      return { key: competitorKey, label, eaValue, competitorValue, deltaPct: null, direction }
    }

    const deltaPct = ((competitorValue - eaValue) / eaValue) * 100
    const direction: ComparisonDirection = deltaPct > 0 ? 'up' : deltaPct < 0 ? 'down' : 'equal'
    return { key: competitorKey, label, eaValue, competitorValue, deltaPct, direction }
  })
}
