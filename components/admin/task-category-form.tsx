'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function TaskCategoryForm() {
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()

  async function handleSubmit() {
    setSubmitting(true)
    try {
      const res = await fetch('/api/task-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        alert(body.error ?? 'Failed to add category')
        return
      }
      setName('')
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-md space-y-3 rounded-md border border-border bg-card p-4">
      <h2 className="font-medium text-foreground">Add task category</h2>
      <Input placeholder="Category name" value={name} onChange={(e) => setName(e.target.value)} />
      <Button disabled={submitting || !name.trim()} onClick={handleSubmit}>
        {submitting ? 'Adding…' : 'Add category'}
      </Button>
    </div>
  )
}
