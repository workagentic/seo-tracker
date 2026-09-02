'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import type { TaskActivity } from '@/types'

const FIELD_LABELS: Record<string, string> = {
  status: 'Status',
  notes: 'Notes',
  action_number: 'Action number',
  title: 'Title',
  description: 'Description',
  position_responsible: 'Position responsible',
  assigned_to: 'Assigned to',
  co_assigned_to: 'Co-owner',
  approver_id: 'Approver',
  due_date: 'Due date',
  quarter: 'Quarter',
  category: 'Category',
  change_request_reason: 'Change request reason',
  link_url: 'Link',
  repeats: 'Repeats',
  next_due: 'Next due',
  linked_finding_id: 'Linked Audit finding',
  linked_keyword_id: 'Linked keyword',
}

export function TaskHistoryDialog({ taskId, actionNumber }: { taskId: string; actionNumber: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [activity, setActivity] = useState<TaskActivity[]>([])

  async function load() {
    setLoading(true)
    try {
      const res = await fetch(`/api/tasks/${taskId}/activity`)
      if (res.ok) {
        const body = await res.json()
        setActivity(body.activity ?? [])
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next: boolean) => {
        setOpen(next)
        if (next) load()
      }}
    >
      <DialogTrigger render={<Button variant="ghost" size="sm">History</Button>} />
      <DialogContent>
        <DialogHeader><DialogTitle>{actionNumber} — Activity History</DialogTitle></DialogHeader>
        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!loading && activity.length === 0 && (
          <p className="text-sm text-muted-foreground">No changes recorded yet.</p>
        )}
        {!loading && activity.length > 0 && (
          <ul className="max-h-96 space-y-2 overflow-y-auto text-sm">
            {activity.map((entry) => (
              <li key={entry.id} className="border-b border-border pb-2 last:border-0">
                <div className="text-foreground">
                  <span className="font-medium">{entry.changed_by_profile?.full_name ?? 'Someone'}</span>{' '}
                  changed <span className="font-medium">{FIELD_LABELS[entry.field] ?? entry.field}</span>
                </div>
                <div className="font-mono text-xs text-muted-foreground">
                  {entry.old_value ?? '—'} → {entry.new_value ?? '—'}
                </div>
                <div className="text-xs text-muted-foreground">{new Date(entry.created_at).toLocaleString()}</div>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  )
}
