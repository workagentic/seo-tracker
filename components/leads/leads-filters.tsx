'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import type { LeadSource } from '@/types'

export function LeadsFilters({ sources }: { sources: LeadSource[] }) {
  const router = useRouter()
  const params = useSearchParams()

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString())
    if (value) next.set(key, value)
    else next.delete(key)
    router.push(`/leads?${next.toString()}`)
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <label className="text-xs text-muted-foreground">From</label>
      <input
        type="date"
        defaultValue={params.get('from') ?? ''}
        onChange={(e) => setParam('from', e.target.value)}
        className="rounded border border-input bg-card px-2 py-1 text-sm text-foreground"
      />
      <label className="text-xs text-muted-foreground">To</label>
      <input
        type="date"
        defaultValue={params.get('to') ?? ''}
        onChange={(e) => setParam('to', e.target.value)}
        className="rounded border border-input bg-card px-2 py-1 text-sm text-foreground"
      />
      <select
        className="rounded border border-input bg-card px-2 py-1 text-sm text-foreground"
        defaultValue={params.get('brand') ?? ''}
        onChange={(e) => setParam('brand', e.target.value)}
      >
        <option value="">All brands</option>
        <option value="workagentic">WorkAgentic</option>
        <option value="expertise_accelerated">Expertise Accelerated</option>
      </select>
      <select
        className="rounded border border-input bg-card px-2 py-1 text-sm text-foreground"
        defaultValue={params.get('source') ?? ''}
        onChange={(e) => setParam('source', e.target.value)}
      >
        <option value="">All sources</option>
        {sources.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
    </div>
  )
}
