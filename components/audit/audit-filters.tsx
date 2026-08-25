'use client'

import { useRouter, useSearchParams } from 'next/navigation'

export function AuditFilters() {
  const router = useRouter()
  const params = useSearchParams()

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString())
    if (value) next.set(key, value)
    else next.delete(key)
    router.push(`/audit?${next.toString()}`)
  }

  return (
    <div className="mb-4 flex gap-2">
      <select className="rounded border px-2 py-1 text-sm" defaultValue={params.get('category') ?? ''} onChange={(e) => setParam('category', e.target.value)}>
        <option value="">All categories</option>
        {['technical', 'backlink', 'content', 'on-page', 'architecture'].map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <select className="rounded border px-2 py-1 text-sm" defaultValue={params.get('severity') ?? ''} onChange={(e) => setParam('severity', e.target.value)}>
        <option value="">All severities</option>
        {['critical', 'high', 'medium', 'low'].map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
      <select className="rounded border px-2 py-1 text-sm" defaultValue={params.get('status') ?? ''} onChange={(e) => setParam('status', e.target.value)}>
        <option value="">All statuses</option>
        {['open', 'in_progress', 'resolved', 'wont_fix'].map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
      </select>
    </div>
  )
}
