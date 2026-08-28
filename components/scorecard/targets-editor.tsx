'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { QuarterTarget } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const QUARTER_KEYS = ['baseline', 'Q1', 'Q2', 'Q3', 'Q4', 'Q5']

const METRIC_FIELDS: { key: keyof QuarterTarget; label: string }[] = [
  { key: 'domain_rating', label: 'Domain Rating' },
  { key: 'organic_traffic_global', label: 'Organic Traffic (Global)' },
  { key: 'organic_traffic_us', label: 'Organic Traffic (US)' },
  { key: 'organic_keywords_global', label: 'Organic Keywords (Global)' },
  { key: 'organic_keywords_us', label: 'Organic Keywords (US)' },
  { key: 'keywords_top_3', label: 'Keywords Top 3' },
  { key: 'keywords_top_10', label: 'Keywords Top 10' },
  { key: 'traffic_value_monthly', label: 'Est. Traffic Value ($/mo)' },
  { key: 'referring_domains_total', label: 'Referring Domains (Total)' },
  { key: 'referring_domains_quality', label: 'Quality Ref. Domains' },
  { key: 'avg_keywords_per_page', label: 'Avg. Keywords / Page' },
  { key: 'indexed_content_pages', label: 'Indexed Content Pages' },
]

function QuarterCard({ quarterKey, target }: { quarterKey: string; target: QuarterTarget }) {
  const router = useRouter()
  const [values, setValues] = useState<Record<string, number>>(
    Object.fromEntries(METRIC_FIELDS.map((f) => [f.key, target[f.key] as number]))
  )
  const [saving, setSaving] = useState(false)

  return (
    <div className="rounded-md border border-border bg-card p-4">
      <h2 className="mb-3 font-medium text-foreground">
        {target.label} <span className="font-normal text-muted-foreground">— {target.date}</span>
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {METRIC_FIELDS.map((f) => (
          <div key={f.key} className="space-y-1">
            <Label htmlFor={`${quarterKey}-${f.key}`} className="text-xs">
              {f.label}
            </Label>
            <Input
              id={`${quarterKey}-${f.key}`}
              type="number"
              step="any"
              value={values[f.key] ?? 0}
              onChange={(e) => setValues((v) => ({ ...v, [f.key]: Number(e.target.value) }))}
            />
          </div>
        ))}
      </div>
      <Button
        className="mt-4"
        size="sm"
        disabled={saving}
        onClick={async () => {
          setSaving(true)
          try {
            const res = await fetch('/api/admin/targets', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ quarter_key: quarterKey, ...values }),
            })
            if (!res.ok) {
              const body = await res.json().catch(() => ({}))
              alert(body.error ?? 'Failed to save')
              return
            }
            router.refresh()
          } finally {
            setSaving(false)
          }
        }}
      >
        {saving ? 'Saving…' : 'Save'}
      </Button>
    </div>
  )
}

export function TargetsEditor({ targets }: { targets: Record<string, QuarterTarget> }) {
  return (
    <div className="space-y-4">
      {QUARTER_KEYS.filter((key) => targets[key]).map((key) => (
        <QuarterCard key={key} quarterKey={key} target={targets[key]} />
      ))}
    </div>
  )
}
