'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function LeadSourceToggle({ id, field, value }: { id: string; field: 'is_active' | 'requires_submission_from'; value: boolean }) {
  const [busy, setBusy] = useState(false)
  const router = useRouter()

  async function toggle() {
    setBusy(true)
    try {
      await fetch(`/api/lead-sources/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: !value }),
      })
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <input type="checkbox" checked={value} disabled={busy} onChange={toggle} />
  )
}
