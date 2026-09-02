'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SCORECARD_ROWS } from '@/lib/scorecard'

function AccountabilityRow({ metricKey, label, ownerNames }: { metricKey: string; label: string; ownerNames: string[] }) {
  const [value, setValue] = useState(ownerNames.join(', '))
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  async function save() {
    setSaving(true)
    try {
      const names = value.split(',').map((n) => n.trim()).filter(Boolean)
      const res = await fetch('/api/admin/accountability', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metric_key: metricKey, owner_names: names }),
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
  }

  return (
    <div className="grid grid-cols-[1fr_2fr_auto] items-end gap-2">
      <Label htmlFor={`accountability-${metricKey}`} className="text-xs">{label}</Label>
      <Input
        id={`accountability-${metricKey}`}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Comma-separated names"
      />
      <Button size="sm" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save'}</Button>
    </div>
  )
}

export function AccountabilityEditor({ accountabilityMap }: { accountabilityMap: Record<string, string[]> }) {
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <h2 className="mb-3 font-medium text-foreground">Accountable Owners</h2>
      <div className="space-y-3">
        {SCORECARD_ROWS.map((row) => (
          <AccountabilityRow key={row.key} metricKey={row.key} label={row.label} ownerNames={accountabilityMap[row.key] ?? []} />
        ))}
      </div>
    </div>
  )
}
