import { buildMetricHistory, HISTORY_METRIC_FIELDS } from '@/lib/snapshot-history'
import type { MetricSnapshot } from '@/types'

const currency = (n: number) => `$${n.toLocaleString()}`
const decimal = (n: number) => n.toFixed(1)

function formatValue(key: string, value: number): string {
  if (key === 'traffic_value_monthly') return currency(value)
  if (key === 'avg_keywords_per_page') return decimal(value)
  return value.toLocaleString()
}

// Weekly-snapshot scrollable feed (CLAUDE.md Section 14 Phase 6): one card per
// metric_snapshots row, newest first, all 12 KPIs + week-over-week change.
export function SnapshotHistoryFeed({ snapshots }: { snapshots: MetricSnapshot[] }) {
  const history = buildMetricHistory(snapshots)

  if (history.length === 0) {
    return <p className="text-sm text-muted-foreground">No snapshots recorded yet.</p>
  }

  return (
    <div className="max-h-[32rem] space-y-3 overflow-y-auto pr-1">
      {history.map(({ snapshot, previous }) => (
        <div key={snapshot.id} className="rounded-md border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-medium text-foreground">
              {new Date(snapshot.snapshot_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
            </h3>
            {snapshot.quarter_label && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {snapshot.quarter_label}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3 lg:grid-cols-4">
            {HISTORY_METRIC_FIELDS.map(({ key, label }) => {
              const value = snapshot[key]
              const prevValue = previous?.[key] ?? null
              const delta = value !== null && prevValue !== null ? value - prevValue : null
              return (
                <div key={key}>
                  <div className="text-xs text-muted-foreground">{label}</div>
                  <div className="font-mono text-foreground">
                    {value !== null ? formatValue(key, value) : '—'}
                    {delta !== null && delta !== 0 && (
                      <span className={delta > 0 ? 'ml-1 text-xs text-green-600' : 'ml-1 text-xs text-red-600'}>
                        {delta > 0 ? '▲' : '▼'}{formatValue(key, Math.abs(delta))}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
