'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ELIGIBLE_OWNER_NAMES } from '@/lib/tasks/constants'
import type { Task } from '@/types'

export const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4', 'All']

export interface TaskFormValues {
  title: string
  description: string
  owner_id: string
  assigned_to_id: string
  due_date: string
  deadline: string
  quarter: string
  category_id: string
  link_url: string
  repeats: string
  next_due: string
  linked_finding_id: string
  linked_keyword_id: string
}

export function emptyTaskForm(task?: Task): TaskFormValues {
  return {
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
  }
}

// Structural task fields, admin/senior-only to edit (CLAUDE.md Section 14) -- shared between
// the New Task dialog (creation) and the task detail panel's edit section (editing an
// existing task moved out of a separate modal and into the panel in Phase 3). No Action
// Number field -- removed 3 Sep 2026, the sprint-sheet-style codes don't apply once tasks are
// created manually; tasks.action_number stays in the schema (nullable) for older data/display
// only, admin/senior can still set one via a direct API call if ever needed.
export function TaskFields({
  form,
  set,
  owners,
  categories = [],
  findings = [],
  keywords = [],
  idPrefix = '',
}: {
  form: TaskFormValues
  set: <K extends keyof TaskFormValues>(key: K, value: TaskFormValues[K]) => void
  owners: { id: string; full_name: string }[]
  categories?: { id: string; name: string }[]
  findings?: { id: string; title: string }[]
  keywords?: { id: string; keyword: string }[]
  idPrefix?: string
}) {
  const eligibleOwners = owners.filter((o) => (ELIGIBLE_OWNER_NAMES as readonly string[]).includes(o.full_name))
  const id = (name: string) => `${idPrefix}${name}`

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor={id('quarter')}>Quarter</Label>
        <select
          id={id('quarter')}
          value={form.quarter}
          onChange={(e) => set('quarter', e.target.value)}
          className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
        >
          <option value="">—</option>
          {QUARTERS.map((q) => <option key={q} value={q}>{q}</option>)}
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor={id('title')}>Title</Label>
        <Input id={id('title')} value={form.title} onChange={(e) => set('title', e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor={id('description')}>Description</Label>
        <Textarea id={id('description')} value={form.description ?? ''} onChange={(e) => set('description', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor={id('owner_id')}>Owner</Label>
          <select
            id={id('owner_id')}
            value={form.owner_id ?? ''}
            onChange={(e) => set('owner_id', e.target.value)}
            className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
          >
            <option value="">—</option>
            {eligibleOwners.map((o) => <option key={o.id} value={o.id}>{o.full_name}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor={id('assigned_to_id')}>Assigned to</Label>
          <select
            id={id('assigned_to_id')}
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
          <Label htmlFor={id('due_date')}>Due date</Label>
          <Input id={id('due_date')} type="date" value={form.due_date ?? ''} onChange={(e) => set('due_date', e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor={id('deadline')}>Deadline</Label>
          <Input
            id={id('deadline')}
            type="date"
            value={form.deadline ?? ''}
            max={form.due_date || undefined}
            onChange={(e) => set('deadline', e.target.value)}
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor={id('category_id')}>Category</Label>
        <select
          id={id('category_id')}
          value={form.category_id ?? ''}
          onChange={(e) => set('category_id', e.target.value)}
          className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
        >
          <option value="">—</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor={id('link_url')}>Link to review</Label>
        <Input id={id('link_url')} type="url" value={form.link_url ?? ''} onChange={(e) => set('link_url', e.target.value)} placeholder="https://…" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor={id('repeats')}>Repeats</Label>
          <Input id={id('repeats')} value={form.repeats ?? ''} onChange={(e) => set('repeats', e.target.value)} placeholder="Weekly, on Friday" />
        </div>
        <div className="space-y-1">
          <Label htmlFor={id('next_due')}>Next due</Label>
          <Input id={id('next_due')} type="date" value={form.next_due ?? ''} onChange={(e) => set('next_due', e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor={id('linked_finding_id')}>Linked Audit finding</Label>
          <select
            id={id('linked_finding_id')}
            value={form.linked_finding_id ?? ''}
            onChange={(e) => set('linked_finding_id', e.target.value)}
            className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
          >
            <option value="">—</option>
            {findings.map((f) => <option key={f.id} value={f.id}>{f.title}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor={id('linked_keyword_id')}>Linked keyword</Label>
          <select
            id={id('linked_keyword_id')}
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
  )
}
