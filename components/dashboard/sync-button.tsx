'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface SyncButtonProps {
  endpoint?: string
  label?: string
}

export function SyncButton({ endpoint = '/api/sync/ahrefs', label = 'Sync Ahrefs data' }: SyncButtonProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  return (
    <Button
      disabled={loading}
      onClick={async () => {
        setLoading(true)
        try {
          const res = await fetch(endpoint, { method: 'POST' })
          if (!res.ok) {
            const body = await res.json().catch(() => ({}))
            alert(body.error ?? 'Sync failed')
            return
          }
          router.refresh()
        } finally {
          setLoading(false)
        }
      }}
    >
      {loading ? 'Syncing…' : label}
    </Button>
  )
}
