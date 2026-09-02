'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import type { QuarterTarget } from '@/types'

// Options come from the live `targets` map (quarterly_targets table) rather than a hardcoded
// list, since the year-qualified keys (e.g. 'Q3-2026') recur and extend over time -- see
// CLAUDE.md Section 14 Phase 1.
export function QuarterSelector({ current, targets }: { current: string; targets: Record<string, QuarterTarget> }) {
  const router = useRouter()
  const params = useSearchParams()

  const options = Object.entries(targets).sort(([, a], [, b]) => a.date.localeCompare(b.date))

  return (
    <select
      value={current}
      onChange={(e) => {
        const next = new URLSearchParams(params.toString())
        next.set('quarter', e.target.value)
        router.push(`/scorecard?${next.toString()}`)
      }}
      className="rounded border border-input bg-card px-3 py-1.5 text-sm text-foreground"
    >
      {options.map(([key, target]) => <option key={key} value={key}>{target.label}</option>)}
    </select>
  )
}
