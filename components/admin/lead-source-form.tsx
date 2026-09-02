'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function LeadSourceForm() {
  const [name, setName] = useState('')
  const [requiresSubmissionFrom, setRequiresSubmissionFrom] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()

  async function handleSubmit() {
    setSubmitting(true)
    try {
      const res = await fetch('/api/lead-sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, requires_submission_from: requiresSubmissionFrom }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        alert(body.error ?? 'Failed to add source')
        return
      }
      setName('')
      setRequiresSubmissionFrom(false)
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-md space-y-3 rounded-md border border-border bg-card p-4">
      <h2 className="font-medium text-foreground">Add lead source</h2>
      <Input placeholder="Source name" value={name} onChange={(e) => setName(e.target.value)} />
      <label className="flex items-center gap-2 text-sm text-foreground">
        <input type="checkbox" checked={requiresSubmissionFrom} onChange={(e) => setRequiresSubmissionFrom(e.target.checked)} />
        Requires &quot;Submission from&quot; on new leads
      </label>
      <Button disabled={submitting || !name} onClick={handleSubmit}>
        {submitting ? 'Adding…' : 'Add source'}
      </Button>
    </div>
  )
}
