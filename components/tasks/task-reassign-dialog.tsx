'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'

// The core handoff workflow (CLAUDE.md Section 14 Phase 2): whoever currently holds a task
// (its Owner or its current Assigned To -- lib/tasks/permissions.ts's canEditTaskStatus,
// which app/api/tasks/[id]/route.ts's PATCH route also enforces server-side) can hand it to
// someone else with an optional deadline. This is a minimal dialog for that; Phase 3's
// slide-in task panel replaces it with a fuller experience.
export function TaskReassignDialog({
  taskId,
  currentUserId,
  dueDate,
  staff,
}: {
  taskId: string
  currentUserId: string
  dueDate: string | null
  staff: { id: string; full_name: string }[]
}) {
  const [open, setOpen] = useState(false)
  const [assignedTo, setAssignedTo] = useState('')
  const [deadline, setDeadline] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()

  async function handleSubmit() {
    if (!assignedTo) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigned_to_id: assignedTo, deadline: deadline || null }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        alert(body.error ?? 'Failed to reassign task')
        return
      }
      setOpen(false)
      setAssignedTo('')
      setDeadline('')
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="sm">Reassign</Button>} />
      <DialogContent>
        <DialogHeader><DialogTitle>Reassign task</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="reassign_to">Assigned to</Label>
            <select
              id="reassign_to"
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
            >
              <option value="">—</option>
              <option value={currentUserId}>Myself</option>
              {staff.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="reassign_deadline">Deadline</Label>
            <Input
              id="reassign_deadline"
              type="date"
              value={deadline}
              max={dueDate ?? undefined}
              onChange={(e) => setDeadline(e.target.value)}
            />
            {dueDate && (
              <p className="text-xs text-muted-foreground">Must be on or before the Due date ({dueDate}).</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button disabled={submitting || !assignedTo} onClick={handleSubmit}>
            {submitting ? 'Saving…' : 'Reassign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
