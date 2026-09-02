'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { TaskFields, emptyTaskForm } from './task-fields'

// Creation only -- editing an existing task moved into the task detail panel's edit section
// in Phase 3 (CLAUDE.md Section 14), which absorbed what used to be this dialog's edit mode.
export function TaskFormDialog({
  owners,
  categories = [],
  findings = [],
  keywords = [],
}: {
  owners: { id: string; full_name: string }[]
  categories?: { id: string; name: string }[]
  findings?: { id: string; title: string }[]
  keywords?: { id: string; keyword: string }[]
}) {
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState(emptyTaskForm())
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit() {
    if (form.deadline && form.due_date && form.deadline > form.due_date) {
      setError('Deadline cannot be later than the Due date')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const payload = {
        action_number: form.action_number,
        title: form.title,
        description: form.description || null,
        owner_id: form.owner_id || null,
        assigned_to_id: form.assigned_to_id || null,
        due_date: form.due_date || null,
        deadline: form.deadline || null,
        quarter: form.quarter || null,
        category_id: form.category_id || null,
        link_url: form.link_url || null,
        repeats: form.repeats || null,
        next_due: form.next_due || null,
        linked_finding_id: form.linked_finding_id || null,
        linked_keyword_id: form.linked_keyword_id || null,
      }
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        alert(body.error ?? 'Failed to save task')
        return
      }
      setOpen(false)
      setForm(emptyTaskForm())
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button>New Task</Button>} />
      <DialogContent>
        <DialogHeader><DialogTitle>New task</DialogTitle></DialogHeader>
        <TaskFields form={form} set={set} owners={owners} categories={categories} findings={findings} keywords={keywords} />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button disabled={submitting || !form.action_number || !form.title} onClick={handleSubmit}>
            {submitting ? 'Saving…' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
