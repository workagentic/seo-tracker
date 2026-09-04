'use client'

import { useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ELIGIBLE_OWNER_NAMES } from '@/lib/tasks/constants'
import type { Profile } from '@/types'

const STORAGE_KEY = 'ea-seo-tracker:task-filters'
const FILTER_KEYS = ['quarter', 'status', 'category', 'owner', 'assignedTo', 'overdue'] as const

// Filters persist per browser (CLAUDE.md Section 14 Phase 3) until "Clear Filters" is
// pressed -- a per-viewer convenience, not synced across devices. localStorage access is
// wrapped in try/catch since a private-browsing/storage-disabled context can throw.
export function TaskFilters({
  owners,
  categories = [],
  isAdmin,
}: {
  owners: Pick<Profile, 'id' | 'full_name'>[]
  categories?: { id: string; name: string }[]
  isAdmin: boolean
}) {
  const router = useRouter()
  const params = useSearchParams()
  const appliedSaved = useRef(false)

  // On first load with no filters in the URL, restore whatever was last saved.
  useEffect(() => {
    if (appliedSaved.current) return
    appliedSaved.current = true
    if (Array.from(params.keys()).some((k) => (FILTER_KEYS as readonly string[]).includes(k))) return
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) router.replace(`/tasks?${saved}`)
    } catch {
      // localStorage unavailable (private browsing, disabled site data, etc.) -- fall back to
      // no persisted filters rather than breaking the page.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString())
    if (value) next.set(key, value)
    else next.delete(key)
    try {
      localStorage.setItem(STORAGE_KEY, next.toString())
    } catch {
      // Ignore -- filters still work for this navigation, just won't persist.
    }
    router.push(`/tasks?${next.toString()}`)
  }

  function clearFilters() {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // Ignore.
    }
    router.push('/tasks')
  }

  const hasFilters = FILTER_KEYS.some((k) => !!params.get(k))
  // Owner is restricted to the 3 people eligible to hold that field (lib/tasks/constants.ts) --
  // filtering by any other owner would always return zero tasks.
  const eligibleOwners = owners.filter((o) => (ELIGIBLE_OWNER_NAMES as readonly string[]).includes(o.full_name))

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <select className="rounded border border-input bg-card px-2 py-1 text-sm text-foreground" defaultValue={params.get('quarter') ?? ''} onChange={(e) => setParam('quarter', e.target.value)}>
        <option value="">All quarters</option>
        {['Q1', 'Q2', 'Q3', 'Q4'].map((q) => <option key={q} value={q}>{q}</option>)}
      </select>
      <select className="rounded border border-input bg-card px-2 py-1 text-sm text-foreground" defaultValue={params.get('status') ?? ''} onChange={(e) => setParam('status', e.target.value)}>
        <option value="">All statuses</option>
        {['pending', 'in_progress', 'on_hold', 'completed'].map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
      </select>
      <select className="rounded border border-input bg-card px-2 py-1 text-sm text-foreground" defaultValue={params.get('category') ?? ''} onChange={(e) => setParam('category', e.target.value)}>
        <option value="">All categories</option>
        {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      {isAdmin && (
        <select className="rounded border border-input bg-card px-2 py-1 text-sm text-foreground" defaultValue={params.get('owner') ?? ''} onChange={(e) => setParam('owner', e.target.value)}>
          <option value="">All owners</option>
          {eligibleOwners.map((o) => <option key={o.id} value={o.id}>{o.full_name}</option>)}
        </select>
      )}
      {isAdmin && (
        <select className="rounded border border-input bg-card px-2 py-1 text-sm text-foreground" defaultValue={params.get('assignedTo') ?? ''} onChange={(e) => setParam('assignedTo', e.target.value)}>
          <option value="">All assigned to</option>
          {owners.map((o) => <option key={o.id} value={o.id}>{o.full_name}</option>)}
        </select>
      )}
      <select className="rounded border border-input bg-card px-2 py-1 text-sm text-foreground" defaultValue={params.get('overdue') ?? ''} onChange={(e) => setParam('overdue', e.target.value)}>
        <option value="">All</option>
        <option value="1">Overdue only</option>
      </select>
      {hasFilters && (
        <Button size="sm" variant="ghost" onClick={clearFilters}>Clear Filters</Button>
      )}
    </div>
  )
}
