'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export function DeleteTaskButton({ taskId, actionNumber }: { taskId: string; actionNumber: string }) {
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={deleting}
      onClick={async () => {
        if (!confirm(`Delete task ${actionNumber}? This cannot be undone.`)) return
        setDeleting(true)
        try {
          const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' })
          if (!res.ok) {
            const body = await res.json().catch(() => ({}))
            alert(body.error ?? 'Failed to delete task')
            return
          }
          router.refresh()
        } finally {
          setDeleting(false)
        }
      }}
    >
      {deleting ? 'Deleting…' : 'Delete'}
    </Button>
  )
}
