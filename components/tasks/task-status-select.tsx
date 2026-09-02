'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import type { TaskStatus } from '@/types'

const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'pending',
  in_progress: 'in progress',
  on_hold: 'on hold',
  completed: 'completed',
}

async function patchStatus(taskId: string, status: TaskStatus, extra?: Record<string, unknown>) {
  await fetch(`/api/tasks/${taskId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, ...extra }),
  })
}

export function TaskStatusSelect({
  taskId,
  status,
  allowedStatuses,
  disabled,
  linkedFindingTitle,
}: {
  taskId: string
  status: TaskStatus
  allowedStatuses: TaskStatus[]
  disabled: boolean
  linkedFindingTitle?: string | null
}) {
  const [value, setValue] = useState(status)
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false)
  const [resolving, setResolving] = useState(false)
  const router = useRouter()

  const options = allowedStatuses.includes(status) ? allowedStatuses : [status, ...allowedStatuses]
  const isDisabled = disabled || allowedStatuses.length === 0

  async function handleChange(next: TaskStatus) {
    if (next === 'completed' && linkedFindingTitle) {
      setResolveDialogOpen(true)
      return
    }
    setValue(next)
    await patchStatus(taskId, next)
    router.refresh()
  }

  async function completeTask(resolveLinkedFinding: boolean) {
    setResolving(true)
    try {
      await patchStatus(taskId, 'completed', { resolve_linked_finding: resolveLinkedFinding })
      setValue('completed')
      setResolveDialogOpen(false)
      router.refresh()
    } finally {
      setResolving(false)
    }
  }

  return (
    <>
      <select
        value={value}
        disabled={isDisabled}
        onChange={(e) => handleChange(e.target.value as TaskStatus)}
        className="rounded border border-input bg-card px-2 py-1 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
      >
        {options.map((s) => (
          <option key={s} value={s}>{STATUS_LABELS[s]}</option>
        ))}
      </select>
      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Complete task?</DialogTitle></DialogHeader>
          <p className="mb-2 text-sm text-muted-foreground">
            This task is linked to the Audit Reports finding <b>&quot;{linkedFindingTitle}&quot;</b>. Also mark
            that finding resolved?
          </p>
          <DialogFooter>
            <Button variant="outline" disabled={resolving} onClick={() => completeTask(false)}>
              Just complete task
            </Button>
            <Button disabled={resolving} onClick={() => completeTask(true)}>
              {resolving ? 'Saving…' : 'Yes, resolve both'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
