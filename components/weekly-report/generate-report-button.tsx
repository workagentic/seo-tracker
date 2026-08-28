'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export function GenerateReportButton() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  return (
    <Button
      disabled={loading}
      onClick={async () => {
        setLoading(true)
        try {
          const res = await fetch('/api/weekly-report/generate', { method: 'POST' })
          if (!res.ok) {
            const body = await res.json().catch(() => ({}))
            alert(body.error ?? 'Failed to generate report')
            return
          }
          router.refresh()
        } finally {
          setLoading(false)
        }
      }}
    >
      {loading ? 'Generating…' : 'Generate Report'}
    </Button>
  )
}
