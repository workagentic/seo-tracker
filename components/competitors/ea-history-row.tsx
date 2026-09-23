'use client'

import { useState } from 'react'
import { buildMetricHistory, HISTORY_METRIC_FIELDS } from '@/lib/snapshot-history'
import { Button } from '@/components/ui/button'
import type { MetricSnapshot } from '@/types'

function formatValue(key: string, value: number): string {
  if (key === 'traffic_value_monthly') return `$${value.toLocaleString()}`
  if (key === 'avg_keywords_per_page') return value.toFixed(1)
  return value.toLocaleString()
}

// EA's own weekly-snapshot history on the Competitors page, mirroring CompetitorHistoryRow's
// per-competitor toggle. Unlike that one, EA's full metric_snapshots history is already
// server-loaded (same data the Dashboard's History tab uses), so this just expands/collapses
// rather than fetching on demand.
export function EaHistoryRow({ snapshots, colSpan }: { snapshots: MetricSnapshot[]; colSpan: number }) {
  const [expanded, setExpanded] = useState(false)
  const history = buildMetricHistory(snapshots)

  return (
    <tr className="bg-primary/5">
      <td colSpan={colSpan} className="border-t-0 px-4 py-1">
        <Button size="xs" variant="ghost" onClick={() => setExpanded((e) => !e)}>
          {expanded ? 'Hide history' : 'Show history'}
        </Button>
        {expanded && (
          <div className="mt-2 max-h-80 space-y-2 overflow-y-auto">
            {history.length === 0 && <p className="text-sm text-muted-foreground">No snapshots recorded yet.</p>}
            {history.map(({ weekStart, snapshot, previous }) => (
              <div key={snapshot.id} className="rounded-md border border-border bg-muted/30 p-3">
                <div className="mb-2 text-xs font-medium text-muted-foreground">
                  Week of {new Date(weekStart).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
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
        )}
      </td>
    </tr>
  )
}
