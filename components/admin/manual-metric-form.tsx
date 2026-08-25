'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { MetricKey } from '@/types'

const FIELDS: { key: MetricKey; label: string }[] = [
  { key: 'domain_rating', label: 'Domain Rating' },
  { key: 'organic_traffic_global', label: 'Organic Traffic (Global)' },
  { key: 'organic_traffic_us', label: 'Organic Traffic (US)' },
  { key: 'organic_keywords_global', label: 'Organic Keywords (Global)' },
  { key: 'organic_keywords_us', label: 'Organic Keywords (US)' },
  { key: 'keywords_top_3', label: 'Keywords #1–3' },
  { key: 'keywords_top_10', label: 'Keywords Top 10' },
  { key: 'traffic_value_monthly', label: 'Traffic Value / mo' },
  { key: 'referring_domains_total', label: 'Referring Domains (Total)' },
  { key: 'referring_domains_quality', label: 'Quality Ref. Domains (manual census)' },
  { key: 'avg_keywords_per_page', label: 'Avg Keywords / Page' },
  { key: 'indexed_content_pages', label: 'Indexed Content Pages' },
]

export function ManualMetricForm() {
  const [snapshotDate, setSnapshotDate] = useState('')
  const [quarterLabel, setQuarterLabel] = useState('')
  const [values, setValues] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit() {
    setSubmitting(true)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshot_date: snapshotDate, quarter_label: quarterLabel, ...values }),
      })
      const body = await res.json()
      if (!res.ok) {
        setMessage(body.error)
        return
      }
      setMessage('Snapshot saved.')
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-lg space-y-3 rounded-md border bg-white p-4">
      <h2 className="font-medium text-slate-900">Enter manual quarterly snapshot</h2>
      <Input type="date" value={snapshotDate} onChange={(e) => setSnapshotDate(e.target.value)} />
      <Input placeholder="Quarter label (e.g. Q1)" value={quarterLabel} onChange={(e) => setQuarterLabel(e.target.value)} />
      <div className="grid grid-cols-2 gap-3">
        {FIELDS.map((field) => (
          <div key={field.key}>
            <label className="mb-1 block text-xs text-slate-500">{field.label}</label>
            <Input
              type="number"
              value={values[field.key] ?? ''}
              onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
            />
          </div>
        ))}
      </div>
      {message && <p className="text-sm text-slate-600">{message}</p>}
      <Button disabled={submitting || !snapshotDate || !quarterLabel} onClick={handleSubmit}>
        {submitting ? 'Saving…' : 'Save snapshot'}
      </Button>
    </div>
  )
}
