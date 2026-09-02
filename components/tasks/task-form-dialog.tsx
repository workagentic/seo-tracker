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
import type { Task } from '@/types'

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4', 'All']

interface TaskFormDialogProps {
  owners: { id: string; full_name: string }[]
  findings?: { id: string; title: string }[]
  keywords?: { id: string; keyword: string }[]
  task?: Task
  trigger?: React.ReactElement
}

export function TaskFormDialog({ owners, findings = [], keywords = [], task, trigger }: TaskFormDialogProps) {
  const isEdit = !!task
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    action_number: task?.action_number ?? '',
    title: task?.title ?? '',
    description: task?.description ?? '',
    assigned_to: task?.assigned_to ?? '',
    co_assigned_to: task?.co_assigned_to ?? '',
    approver_id: task?.approver_id ?? '',
    due_date: task?.due_date ?? '',
    quarter: task?.quarter ?? '',
    category: task?.category ?? '',
    link_url: task?.link_url ?? '',
    repeats: task?.repeats ?? '',
    next_due: task?.next_due ?? '',
    linked_finding_id: task?.linked_finding_id ?? '',
    linked_keyword_id: task?.linked_keyword_id ?? '',
  })
  const router = useRouter()

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit() {
    setSubmitting(true)
    try {
      const payload = {
        action_number: form.action_number,
        title: form.title,
        description: form.description || null,
        assigned_to: form.assigned_to || null,
        co_assigned_to: form.co_assigned_to || null,
        approver_id: form.approver_id || null,
        due_date: form.due_date || null,
        quarter: form.quarter || null,
        category: form.category || null,
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
              <Label htmlFor="assigned_to">Assigned to</Label>
              <select
                id="assigned_to"
                value={form.assigned_to ?? ''}
                onChange={(e) => set('assigned_to', e.target.value)}
                className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
              >
                <option value="">—</option>
                {owners.map((o) => <option key={o.id} value={o.id}>{o.full_name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="co_assigned_to">Co-owner</Label>
              <select
                id="co_assigned_to"
                value={form.co_assigned_to ?? ''}
                onChange={(e) => set('co_assigned_to', e.target.value)}
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
              <Label htmlFor="category">Category</Label>
              <Input id="category" value={form.category ?? ''} onChange={(e) => set('category', e.target.value)} placeholder="Service Pages" />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="approver_id">Approver</Label>
            <select
              id="approver_id"
              value={form.approver_id ?? ''}
              onChange={(e) => set('approver_id', e.target.value)}
              className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
            >
              <option value="">— No sign-off required —</option>
              {owners.map((o) => <option key={o.id} value={o.id}>{o.full_name}</option>)}
            </select>
          </div>
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
