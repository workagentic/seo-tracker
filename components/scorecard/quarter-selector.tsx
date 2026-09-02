'use client'

import { useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { QuarterTarget } from '@/types'

const STORAGE_KEY = 'ea-seo-tracker:scorecard-quarter'

// Options come from the live `targets` map (quarterly_targets table) rather than a hardcoded
// list, since the year-qualified keys (e.g. 'Q3-2026') recur and extend over time -- see
// CLAUDE.md Section 14 Phase 1. Selection persists per browser (Phase 5), same localStorage
// pattern as the Task Tracker's filters.
export function QuarterSelector({ current, targets }: { current: string; targets: Record<string, QuarterTarget> }) {
  const router = useRouter()
  const params = useSearchParams()
  const appliedSaved = useRef(false)

  useEffect(() => {
    if (appliedSaved.current) return
    appliedSaved.current = true
    if (params.get('quarter')) return
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved && saved in targets) router.replace(`/scorecard?quarter=${saved}`)
    } catch {
      // localStorage unavailable -- fall back to no persisted selection.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const options = Object.entries(targets).sort(([, a], [, b]) => a.date.localeCompare(b.date))

  return (
    <select
      value={current}
      onChange={(e) => {
        const next = new URLSearchParams(params.toString())
        next.set('quarter', e.target.value)
        try {
          localStorage.setItem(STORAGE_KEY, e.target.value)
        } catch {
          // Ignore -- selection still works for this navigation, just won't persist.
        }
        router.push(`/scorecard?${next.toString()}`)
      }}
      className="rounded border border-input bg-card px-3 py-1.5 text-sm text-foreground"
    >
      {options.map(([key, target]) => <option key={key} value={key}>{target.label}</option>)}
    </select>
  )
}
