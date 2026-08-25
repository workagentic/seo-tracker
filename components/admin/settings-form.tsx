'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { AppSettings } from '@/types'

export function SettingsForm({ settings }: { settings: AppSettings }) {
  const [targetDomain, setTargetDomain] = useState(settings.target_domain)
  const [gscSiteUrl, setGscSiteUrl] = useState(settings.gsc_site_url ?? '')
  const [ga4PropertyId, setGa4PropertyId] = useState(settings.ga4_property_id ?? '')
  const [message, setMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()

  async function handleSubmit() {
    setSubmitting(true)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_domain: targetDomain,
          gsc_site_url: gscSiteUrl,
          ga4_property_id: ga4PropertyId,
        }),
      })
      const body = await res.json()
      if (!res.ok) {
        setMessage(body.error)
        return
      }
      setMessage('Settings saved.')
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-md space-y-3 rounded-md border border-border bg-card p-4">
      <h2 className="font-medium text-foreground">Sync targets</h2>
      <div>
        <label className="mb-1 block text-xs text-muted-foreground">Ahrefs target domain</label>
        <Input value={targetDomain} onChange={(e) => setTargetDomain(e.target.value)} />
      </div>
      <div>
        <label className="mb-1 block text-xs text-muted-foreground">
          GSC site URL <span className="text-muted-foreground/70">(v2 — GSC sync not built yet)</span>
        </label>
        <Input value={gscSiteUrl} onChange={(e) => setGscSiteUrl(e.target.value)} placeholder="https://expertiseaccelerated.com/" />
      </div>
      <div>
        <label className="mb-1 block text-xs text-muted-foreground">
          GA4 property ID <span className="text-muted-foreground/70">(v2 — GA4 sync not built yet)</span>
        </label>
        <Input value={ga4PropertyId} onChange={(e) => setGa4PropertyId(e.target.value)} placeholder="123456789" />
      </div>
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
      <Button disabled={submitting || !targetDomain} onClick={handleSubmit}>
        {submitting ? 'Saving…' : 'Save settings'}
      </Button>
    </div>
  )
}
