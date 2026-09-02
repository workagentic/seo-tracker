'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import type { Profile } from '@/types'

export function TaskFilters({ owners }: { owners: Pick<Profile, 'id' | 'full_name'>[] }) {
  const router = useRouter()
  const params = useSearchParams()

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString())
    if (value) next.set(key, value)
    else next.delete(key)
    router.push(`/tasks?${next.toString()}`)
  }

  return (
    <div className="mb-4 flex flex-wrap gap-2">
      <select className="rounded border border-input bg-card px-2 py-1 text-sm text-foreground" defaultValue={params.get('mine') ?? ''} onChange={(e) => setParam('mine', e.target.value)}>
        <option value="">All tasks</option>
        <option value="1">My tasks only</option>
      </select>
      <select className="rounded border border-input bg-card px-2 py-1 text-sm text-foreground" defaultValue={params.get('quarter') ?? ''} onChange={(e) => setParam('quarter', e.target.value)}>
        <option value="">All quarters</option>
        {['Q1', 'Q2', 'Q3', 'Q4'].map((q) => <option key={q} value={q}>{q}</option>)}
      </select>
      <select className="rounded border border-input bg-card px-2 py-1 text-sm text-foreground" defaultValue={params.get('status') ?? ''} onChange={(e) => setParam('status', e.target.value)}>
        <option value="">All statuses</option>
        {['pending', 'in_progress', 'on_hold', 'completed'].map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
      </select>
      <select className="rounded border border-input bg-card px-2 py-1 text-sm text-foreground" defaultValue={params.get('owner') ?? ''} onChange={(e) => setParam('owner', e.target.value)}>
        <option value="">All owners</option>
        {owners.map((o) => <option key={o.id} value={o.id}>{o.full_name}</option>)}
      </select>
      <select className="rounded border border-input bg-card px-2 py-1 text-sm text-foreground" defaultValue={params.get('overdue') ?? ''} onChange={(e) => setParam('overdue', e.target.value)}>
        <option value="">All</option>
        <option value="1">Overdue only</option>
      </select>
    </div>
  )
}
