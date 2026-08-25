'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { TaskStatus } from '@/types'

const STATUSES: TaskStatus[] = ['pending', 'in_progress', 'completed', 'blocked', 'overdue']

export function TaskStatusSelect({ taskId, status, disabled }: { taskId: string; status: TaskStatus; disabled: boolean }) {
  const [value, setValue] = useState(status)
  const router = useRouter()

  return (
    <select
      value={value}
      disabled={disabled}
      onChange={async (e) => {
        const next = e.target.value as TaskStatus
        setValue(next)
        await fetch(`/api/tasks/${taskId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: next }),
        })
        router.refresh()
      }}
      className="rounded border border-input bg-card px-2 py-1 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
    >
      {STATUSES.map((s) => (
        <option key={s} value={s}>{s.replace('_', ' ')}</option>
      ))}
    </select>
  )
}
