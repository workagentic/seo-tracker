'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog'
import { ELIGIBLE_OWNER_NAMES } from '@/lib/tasks/constants'
import type { Task } from '@/types'

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4', 'All']

interface TaskFormDialogProps {
  owners: { id: string; full_name: string }[]
  categories?: { id: string; name: string }[]
  findings?: { id: string; title: string }[]
  keywords?: { id: string; keyword: string }[]
  task?: Task
  trigger?: React.ReactElement
}

export function TaskFormDialog({ owners, categories = [], findings = [], keywords = [], task, trigger }: TaskFormDialogProps) {
  const isEdit = !!task
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    action_number: task?.action_number ?? '',
    title: task?.title ?? '',
    description: task?.description ?? '',
    owner_id: task?.owner_id ?? '',
    assigned_to_id: task?.assigned_to_id ?? '',
    due_date: task?.due_date ?? '',
    deadline: task?.deadline ?? '',
    quarter: task?.quarter ?? '',
    category_id: task?.category_id ?? '',
    link_url: task?.link_url ?? '',
    repeats: task?.repeats ?? '',
    next_due: task?.next_due ?? '',
    linked_finding_id: task?.linked_finding_id ?? '',
    linked_keyword_id: task?.linked_keyword_id ?? '',
  })
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // Owner is restricted to exactly 3 people (CLAUDE.md Section 14 Phase 2) -- a task-level
  // rule, not a profiles.role gate, so it's filtered from the same full staff list rather than
  // a separate fetch.
  const eligibleOwners = owners.filter((o) => (ELIGIBLE_OWNER_NAMES as readonly string[]).includes(o.full_name))

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
      const res = await fetch(isEdit ? `/api/tasks/${task!.id}` : '/api/tasks', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        alert(body.error ?? 'Failed to save task')
        return
      }
      setOpen(false)
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger ?? <Button>New Task</Button>} />
      <DialogContent>
        <DialogHeader><DialogTitle>{isEdit ? 'Edit task' : 'New task'}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="action_number">Action number</Label>
              <Input id="action_number" value={form.action_number} onChange={(e) => set('action_number', e.target.value)} placeholder="A35" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="quarter">Quarter</Label>
              <select
                id="quarter"
                value={form.quarter}
                onChange={(e) => set('quarter', e.target.value)}
                className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
              >
                <option value="">—</option>
                {QUARTERS.map((q) => <option key={q} value={q}>{q}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={form.title} onChange={(e) => set('title', e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={form.description ?? ''} onChange={(e) => set('description', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="owner_id">Owner</Label>
              <select
                id="owner_id"
                value={form.owner_id ?? ''}
                onChange={(e) => set('owner_id', e.target.value)}
                className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
              >
                <option value="">—</option>
                {eligibleOwners.map((o) => <option key={o.id} value={o.id}>{o.full_name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="assigned_to_id">Assigned to</Label>
              <select
                id="assigned_to_id"
                value={form.assigned_to_id ?? ''}
                onChange={(e) => set('assigned_to_id', e.target.value)}
                className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
              >
                <option value="">—</option>
                {owners.map((o) => <option key={o.id} value={o.id}>{o.full_name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="due_date">Due date</Label>
              <Input id="due_date" type="date" value={form.due_date ?? ''} onChange={(e) => set('due_date', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="deadline">Deadline</Label>
              <Input
                id="deadline"
                type="date"
                value={form.deadline ?? ''}
                max={form.due_date || undefined}
                onChange={(e) => set('deadline', e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="category_id">Category</Label>
            <select
              id="category_id"
              value={form.category_id ?? ''}
              onChange={(e) => set('category_id', e.target.value)}
              className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
            >
              <option value="">—</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="space-y-1">
            <Label htmlFor="link_url">Link to review</Label>
            <Input id="link_url" type="url" value={form.link_url ?? ''} onChange={(e) => set('link_url', e.target.value)} placeholder="https://…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="repeats">Repeats</Label>
              <Input id="repeats" value={form.repeats ?? ''} onChange={(e) => set('repeats', e.target.value)} placeholder="Weekly, on Friday" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="next_due">Next due</Label>
              <Input id="next_due" type="date" value={form.next_due ?? ''} onChange={(e) => set('next_due', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="linked_finding_id">Linked Audit finding</Label>
              <select
                id="linked_finding_id"
                value={form.linked_finding_id ?? ''}
                onChange={(e) => set('linked_finding_id', e.target.value)}
                className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
              >
                <option value="">—</option>
                {findings.map((f) => <option key={f.id} value={f.id}>{f.title}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="linked_keyword_id">Linked keyword</Label>
              <select
                id="linked_keyword_id"
                value={form.linked_keyword_id ?? ''}
                onChange={(e) => set('linked_keyword_id', e.target.value)}
                className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
              >
                <option value="">—</option>
                {keywords.map((k) => <option key={k.id} value={k.id}>{k.keyword}</option>)}
              </select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button disabled={submitting || !form.action_number || !form.title} onClick={handleSubmit}>
            {submitting ? 'Saving…' : isEdit ? 'Save' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
