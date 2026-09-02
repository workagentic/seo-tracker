import { buildScorecardRows } from '@/lib/scorecard'
import { RagBadge } from '@/components/dashboard/rag-badge'
import type { MetricSnapshot, QuarterTarget } from '@/types'

export function ScorecardTable({
  snapshot,
  target,
  accountabilityMap,
}: {
  snapshot: MetricSnapshot | null
  target: QuarterTarget
  accountabilityMap: Record<string, string[]>
}) {
  const rows = buildScorecardRows(snapshot, target, accountabilityMap)

  return (
    <div className="overflow-hidden rounded-md border border-border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-muted text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-2">Critical Statistic</th>
            <th className="px-4 py-2">Target</th>
            <th className="px-4 py-2">Actual</th>
            <th className="px-4 py-2">Variance</th>
            <th className="px-4 py-2">RAG</th>
            <th className="px-4 py-2">Accountable Owner</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row) => (
            <tr key={row.key} className="hover:bg-muted/50">
              <td className="px-4 py-2 text-foreground">{row.label}</td>
              <td className="px-4 py-2 font-mono text-muted-foreground">{row.target.toLocaleString()}</td>
              <td className="px-4 py-2 font-mono text-muted-foreground">{row.actual !== null ? row.actual.toLocaleString() : '—'}</td>
              <td className="px-4 py-2 font-mono text-muted-foreground">
                {row.variance !== null ? `${row.variance >= 0 ? '+' : ''}${row.variance.toLocaleString()} (${row.variancePct!.toFixed(1)}%)` : '—'}
              </td>
              <td className="px-4 py-2"><RagBadge status={row.ragStatus} /></td>
              <td className="px-4 py-2 text-muted-foreground">{row.owners.join(', ') || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
