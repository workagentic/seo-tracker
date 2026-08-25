'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export function SyncCompetitorsButton() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  return (
    <Button
      variant="outline"
      disabled={loading}
      onClick={async () => {
        setLoading(true)
        try {
          const res = await fetch('/api/competitors/sync', { method: 'POST' })
          const body = await res.json().catch(() => ({}))
          if (!res.ok) {
            alert(body.error ?? 'Sync failed')
            return
          }
          alert(body.summary ?? 'Sync complete')
          router.refresh()
        } finally {
          setLoading(false)
        }
      }}
    >
      {loading ? 'Syncing…' : 'Sync competitors'}
    </Button>
  )
}
