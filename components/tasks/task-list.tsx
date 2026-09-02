'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { Profile, Task, TaskStatus } from '@/types'
import { TaskStatusSelect } from './task-status-select'
import { TaskFormDialog } from './task-form-dialog'
import { DeleteTaskButton } from './delete-task-button'
import { TaskHistoryDialog } from './task-history-dialog'
import { TaskCommentsDialog } from './task-comments-dialog'
import { TaskReassignDialog } from './task-reassign-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SortableTh, compareValues, type SortState } from '@/components/ui/sortable-th'
import { canEditTaskStatus, getAllowedStatuses } from '@/lib/tasks/permissions'

const BULK_STATUSES: TaskStatus[] = ['pending', 'in_progress', 'on_hold', 'completed']

function sortValue(task: Task, key: string): unknown {
  switch (key) {
    case 'action_number': return task.action_number
    case 'title': return task.title
    case 'owner': return task.owner_profile?.full_name ?? null
    case 'assigned_to': return task.assigned_to_profile?.full_name ?? null
    case 'due_date': return task.next_due ?? task.due_date
    case 'status': return task.status
    default: return null
  }
}

function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

function exportCsv(tasks: Task[]) {
  const headers = ['Action', 'Title', 'Category', 'Owner', 'Assigned To', 'Due', 'Status']
  const rows = tasks.map((t) => [
    t.action_number,
    t.title,
    t.category?.name ?? '',
    t.owner_profile?.full_name ?? '',
    t.assigned_to_profile?.full_name ?? '',
    t.next_due ?? t.due_date ?? '',
    t.status,
  ])
  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `tasks-export-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function TaskList({
  tasks,
  currentProfile,
  owners,
  categories = [],
  findings = [],
  keywords = [],
}: {
  tasks: Task[]
  currentProfile: Profile
  owners: { id: string; full_name: string }[]
  categories?: { id: string; name: string }[]
  findings?: { id: string; title: string }[]
  keywords?: { id: string; keyword: string }[]
}) {
  const now = new Date()
  const today = now.toISOString().slice(0, 10)
  const isAdmin = currentProfile.role === 'admin'
  const canBulkEdit = currentProfile.role === 'admin' || currentProfile.role === 'head' || currentProfile.role === 'owner'
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortState | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkAssignTo, setBulkAssignTo] = useState('')
  const [bulkStatus, setBulkStatus] = useState('')
  const [bulkBusy, setBulkBusy] = useState(false)
  const [flashId, setFlashId] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const highlightId = searchParams.get('highlight')

  // Clicking a notification-bell entry links here with ?highlight=<taskId> -- scroll to and
  // briefly flash that row so it's easy to find in a long list.
  useEffect(() => {
    if (!highlightId) return
    const el = document.getElementById(`task-row-${highlightId}`)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setFlashId(highlightId)
    const t = setTimeout(() => setFlashId(null), 2500)
    return () => clearTimeout(t)
  }, [highlightId])

  const visibleTasks = useMemo(() => {
    const q = search.trim().toLowerCase()
    let result = tasks
    if (q) {
      result = tasks.filter((t) =>
        [t.action_number, t.title, t.owner_profile?.full_name, t.assigned_to_profile?.full_name]
          .some((v) => v?.toLowerCase().includes(q))
      )
    }
    if (sort) {
      result = [...result].sort((a, b) => compareValues(sortValue(a, sort.key), sortValue(b, sort.key), sort.dir))
    }
    return result
  }, [tasks, search, sort])

  function toggleSort(key: string) {
    setSort((s) => (s?.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }))
  }

  function toggleSelected(id: string) {
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const allVisibleSelected = visibleTasks.length > 0 && visibleTasks.every((t) => selected.has(t.id))

  async function runBulk(payload: Record<string, unknown>) {
    setBulkBusy(true)
    try {
      const res = await fetch('/api/tasks/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selected), ...payload }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(body.error ?? 'Bulk action failed')
        return
      }
      if (body.skipped > 0) alert(`Updated ${body.updated}, skipped ${body.skipped} you're not allowed to change.`)
      setSelected(new Set())
      setBulkAssignTo('')
      setBulkStatus('')
      router.refresh()
    } finally {
      setBulkBusy(false)
    }
  }

  return (
    <div>
      <Input
        placeholder="Search tasks…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-3 max-w-sm"
      />
      {selected.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-2 text-sm">
          <span className="font-medium text-foreground">{selected.size} selected</span>
          {isAdmin && (
            <>
              <select
                value={bulkAssignTo}
                onChange={(e) => setBulkAssignTo(e.target.value)}
                className="h-8 rounded border border-input bg-card px-2 text-xs"
              >
                <option value="">Reassign to…</option>
                {owners.map((o) => <option key={o.id} value={o.id}>{o.full_name}</option>)}
              </select>
              <Button
                size="sm"
                variant="outline"
                disabled={bulkBusy || !bulkAssignTo}
                onClick={() => runBulk({ action: 'reassign', assigned_to_id: bulkAssignTo })}
              >
                Apply
              </Button>
            </>
          )}
          {canBulkEdit && (
            <>
              <select
                value={bulkStatus}
                onChange={(e) => setBulkStatus(e.target.value)}
                className="h-8 rounded border border-input bg-card px-2 text-xs"
              >
                <option value="">Set status to…</option>
                {BULK_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
              </select>
              <Button
                size="sm"
                variant="outline"
                disabled={bulkBusy || !bulkStatus}
                onClick={() => runBulk({ action: 'set_status', status: bulkStatus })}
              >
                Apply
              </Button>
            </>
          )}
          <Button size="sm" variant="outline" onClick={() => exportCsv(visibleTasks.filter((t) => selected.has(t.id)))}>
            Export CSV
          </Button>
          <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setSelected(new Set())}>
            Cancel
          </Button>
        </div>
      )}
      <div className="overflow-x-auto rounded-md border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs font-medium uppercase text-muted-foreground">
            <tr>
              <th className="w-8 px-4 py-2">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={(e) =>
                    setSelected(e.target.checked ? new Set(visibleTasks.map((t) => t.id)) : new Set())
                  }
                />
              </th>
              <SortableTh label="Action" sortKey="action_number" currentSort={sort} onSort={toggleSort} />
              <SortableTh label="Title" sortKey="title" currentSort={sort} onSort={toggleSort} />
              <SortableTh label="Owner" sortKey="owner" currentSort={sort} onSort={toggleSort} />
              <SortableTh label="Assigned To" sortKey="assigned_to" currentSort={sort} onSort={toggleSort} />
              <SortableTh label="Due" sortKey="due_date" currentSort={sort} onSort={toggleSort} />
              <SortableTh label="Status" sortKey="status" currentSort={sort} onSort={toggleSort} />
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {visibleTasks.map((task) => {
              const effectiveDue = task.next_due ?? task.due_date
              const isOverdue = !!effectiveDue && effectiveDue < today && task.status !== 'completed'
              const canEdit = currentProfile.role === 'admin' || currentProfile.role === 'head' || canEditTaskStatus(task, currentProfile)
              const allowedStatuses = getAllowedStatuses(task, currentProfile)

              return (
                <tr
                  key={task.id}
                  id={`task-row-${task.id}`}
                  className={`hover:bg-muted/50 ${flashId === task.id ? 'bg-amber-100 transition-colors duration-1000' : ''}`}
                >
                  <td className="px-4 py-2">
                    <input type="checkbox" checked={selected.has(task.id)} onChange={() => toggleSelected(task.id)} />
                  </td>
                  <td className="px-4 py-2 font-mono font-medium text-foreground">{task.action_number}</td>
                  <td className="px-4 py-2 text-foreground">
                    {task.title}
                    {task.category && (
                      <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                        {task.category.name}
                      </span>
                    )}
                    {task.link_url && (
                      <a
                        href={task.link_url}
                        target="_blank"
                        rel="noreferrer"
                        title={task.link_url}
                        className="ml-2 text-xs text-indigo-600 hover:underline"
                      >
                        🔗 link
                      </a>
                    )}
                    {task.linked_finding && (
                      <span
                        title={task.linked_finding.title}
                        className="ml-2 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700"
                      >
                        ↳ {task.linked_finding.title.length > 24 ? `${task.linked_finding.title.slice(0, 24)}…` : task.linked_finding.title}
                      </span>
                    )}
                    {task.linked_keyword && (
                      <span className="ml-2 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                        ↳ {task.linked_keyword.keyword}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">{task.owner_profile?.full_name ?? '—'}</td>
                  <td className="px-4 py-2 text-muted-foreground">{task.assigned_to_profile?.full_name ?? '—'}</td>
                  <td className={`px-4 py-2 font-mono ${isOverdue ? 'font-medium text-red-600' : 'text-muted-foreground'}`}>
                    {task.repeats ? `${task.repeats}${task.next_due ? ` · next ${task.next_due}` : ''}` : task.due_date ?? 'Recurring'}
                  </td>
                  <td className="px-4 py-2">
                    <TaskStatusSelect
                      taskId={task.id}
                      status={task.status}
                      allowedStatuses={allowedStatuses}
                      disabled={!canEdit}
                      linkedFindingTitle={task.linked_finding?.title ?? null}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex gap-1">
                      <TaskHistoryDialog taskId={task.id} actionNumber={task.action_number} />
                      <TaskCommentsDialog
                        taskId={task.id}
                        actionNumber={task.action_number}
                        canComment={currentProfile.role === 'admin' || currentProfile.role === 'head' || currentProfile.role === 'owner'}
                      />
                      {canEdit && (
                        <TaskReassignDialog
                          taskId={task.id}
                          currentUserId={currentProfile.id}
                          dueDate={task.due_date}
                          staff={owners}
                        />
                      )}
                      {isAdmin && (
                        <>
                          <TaskFormDialog
                            owners={owners}
                            categories={categories}
                            findings={findings}
                            keywords={keywords}
                            task={task}
                            trigger={<Button variant="ghost" size="sm">Edit</Button>}
                          />
                          <DeleteTaskButton taskId={task.id} actionNumber={task.action_number} />
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
            {visibleTasks.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-muted-foreground">
                  No tasks match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
