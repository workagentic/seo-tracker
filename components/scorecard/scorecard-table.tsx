import { calculateRAG } from '@/lib/rag'
import { ACCOUNTABILITY_MAP } from '@/lib/constants'
import { RagBadge } from '@/components/dashboard/rag-badge'
import type { MetricKey, MetricSnapshot, QuarterTarget } from '@/types'

const ROWS: { key: MetricKey; label: string }[] = [
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

export function ScorecardTable({ snapshot, target }: { snapshot: MetricSnapshot | null; target: QuarterTarget }) {
  return (
    <div className="overflow-hidden rounded-md border bg-white">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
          <tr>
            <th className="px-4 py-2">Critical Statistic</th>
            <th className="px-4 py-2">Target</th>
            <th className="px-4 py-2">Actual</th>
            <th className="px-4 py-2">Variance</th>
            <th className="px-4 py-2">RAG</th>
            <th className="px-4 py-2">Accountable Owner</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {ROWS.map((row) => {
            const actual = snapshot?.[row.key] ?? null
            const targetValue = target[row.key]
            const status = calculateRAG(actual, targetValue)
            const variance = actual !== null ? actual - targetValue : null
            const variancePct = actual !== null ? ((actual - targetValue) / targetValue) * 100 : null
            const owners = ACCOUNTABILITY_MAP[row.key] ?? []

            return (
              <tr key={row.key}>
                <td className="px-4 py-2 text-slate-900">{row.label}</td>
                <td className="px-4 py-2 text-slate-600">{targetValue.toLocaleString()}</td>
                <td className="px-4 py-2 text-slate-600">{actual !== null ? actual.toLocaleString() : '—'}</td>
                <td className="px-4 py-2 text-slate-600">
                  {variance !== null ? `${variance >= 0 ? '+' : ''}${variance.toLocaleString()} (${variancePct!.toFixed(1)}%)` : '—'}
                </td>
                <td className="px-4 py-2"><RagBadge status={status} /></td>
                <td className="px-4 py-2 text-slate-600">{owners.join(', ') || '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
