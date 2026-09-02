'use client'

import { useState } from 'react'
import { buildCompetitorHistory, COMPETITOR_HISTORY_FIELDS } from '@/lib/snapshot-history'
import { Button } from '@/components/ui/button'
import type { CompetitorSnapshot } from '@/types'

function formatValue(key: string, value: number): string {
  if (key === 'est_traffic_value') return `$${value.toLocaleString()}`
  return value.toLocaleString()
}

// Per-competitor weekly-snapshot history (CLAUDE.md Section 14 Phase 6), fetched on demand
// when expanded rather than pre-loaded for every competitor up front.
export function CompetitorHistoryRow({ competitorId, colSpan }: { competitorId: string; colSpan: number }) {
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [snapshots, setSnapshots] = useState<CompetitorSnapshot[] | null>(null)

  async function toggle() {
    if (!expanded && snapshots === null) {
      setLoading(true)
      try {
        const res = await fetch(`/api/competitors/${competitorId}/snapshots`)
        if (res.ok) {
          const body = await res.json()
          setSnapshots(body.snapshots ?? [])
        }
      } finally {
        setLoading(false)
      }
    }
    setExpanded((e) => !e)
  }

  const history = snapshots ? buildCompetitorHistory(snapshots) : []

  return (
    <tr>
      <td colSpan={colSpan} className="border-t-0 px-4 py-1">
        <Button size="xs" variant="ghost" onClick={toggle}>
          {expanded ? 'Hide history' : 'Show history'}
        </Button>
        {expanded && (
          <div className="mt-2 max-h-80 space-y-2 overflow-y-auto">
            {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
            {!loading && history.length === 0 && <p className="text-sm text-muted-foreground">No snapshots recorded yet.</p>}
            {!loading && history.map(({ snapshot, previous }) => (
              <div key={snapshot.id} className="rounded-md border border-border bg-muted/30 p-3">
                <div className="mb-2 text-xs font-medium text-muted-foreground">
                  {new Date(snapshot.snapshot_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
                  {COMPETITOR_HISTORY_FIELDS.map(({ key, label }) => {
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
