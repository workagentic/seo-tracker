'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { Profile, Task, TaskStatus } from '@/types'
import { TaskStatusSelect } from './task-status-select'
import { TaskDetailPanel } from './task-detail-panel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SortableTh, compareValues, type SortState } from '@/components/ui/sortable-th'
import { canEditTaskStatus, getAllowedStatuses } from '@/lib/tasks/permissions'

const BULK_STATUSES: TaskStatus[] = ['pending', 'in_progress', 'on_hold', 'completed']
const RED_FLAG_DAYS = 3
const STATUS_DECK: { key: TaskStatus; label: string }[] = [
  { key: 'pending', label: 'Pending' },
  { key: 'in_progress', label: 'In-Progress' },
  { key: 'on_hold', label: 'On-Hold' },
  { key: 'completed', label: 'Completed' },
]

function effectiveDueOf(task: Task): string | null {
  return task.next_due ?? task.due_date
}

function sortValue(task: Task, key: string): unknown {
  switch (key) {
    case 'action_number': return task.action_number
    case 'title': return task.title
    case 'owner': return task.owner_profile?.full_name ?? null
    case 'assigned_to': return task.assigned_to_profile?.full_name ?? null
    case 'due_date': return effectiveDueOf(task)
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
    t.action_number ?? '',
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
  const redFlagCutoff = new Date(now.getTime() + RED_FLAG_DAYS * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  // admin and senior both get bulk reassign -- senior is near-admin for task management
  // (CLAUDE.md Section 14), not just an admin-tab visibility grant.
  const canManageAllTasks = currentProfile.role === 'admin' || currentProfile.role === 'senior'
  // Every current role can bulk-set-status (the per-row permission check server-side still
  // scopes what each caller can actually change -- this just controls whether the toolbar
  // control is shown at all).
  const canBulkEdit = true
  const [search, setSearch] = useState('')
  // Defaults to the same due-date-ascending order Task No is computed from, so the row order
  // and the Task No labels agree by construction (Hameed's feedback: the old action_number
  // text sort put "DR10" before "DR2"). compareValues sorts nulls last regardless of direction.
  const [sort, setSort] = useState<SortState | null>({ key: 'due_date', dir: 'asc' })
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkAssignTo, setBulkAssignTo] = useState('')
  const [bulkStatus, setBulkStatus] = useState('')
  const [bulkBusy, setBulkBusy] = useState(false)
  const [flashId, setFlashId] = useState<string | null>(null)
  const [openTaskId, setOpenTaskId] = useState<string | null>(null)
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

  // Task No: a live-computed rank, never stored (CLAUDE.md Section 14 Phase 3) -- soonest
  // effective due date gets 01, recalculated fresh from whatever's currently visible.
  // Undated tasks sort last (lowest urgency).
  const taskNoById = useMemo(() => {
    const ranked = [...visibleTasks].sort((a, b) => {
      const dueA = effectiveDueOf(a)
      const dueB = effectiveDueOf(b)
      if (dueA === dueB) return 0
      if (dueA === null) return 1
      if (dueB === null) return -1
      return dueA.localeCompare(dueB)
    })
    return new Map(ranked.map((t, i) => [t.id, String(i + 1).padStart(2, '0')]))
  }, [visibleTasks])

  const statusCounts = useMemo(() => {
    const counts: Record<TaskStatus, number> = { pending: 0, in_progress: 0, on_hold: 0, completed: 0 }
    for (const t of tasks) counts[t.status]++
    return counts
  }, [tasks])

  const openTask = tasks.find((t) => t.id === openTaskId) ?? null

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
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {STATUS_DECK.map((s) => (
          <div key={s.key} className="rounded-md border border-border bg-card p-3">
            <div className="text-xs font-medium uppercase text-muted-foreground">{s.label}</div>
            <div className="text-2xl font-semibold text-foreground">{statusCounts[s.key]}</div>
          </div>
        ))}
      </div>
      <Input
        placeholder="Search tasks…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-3 max-w-sm"
      />
      {selected.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-2 text-sm">
          <span className="font-medium text-foreground">{selected.size} selected</span>
          {canManageAllTasks && (
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
              <SortableTh label="Task No" sortKey="due_date" currentSort={sort} onSort={toggleSort} />
              <SortableTh label="Title" sortKey="title" currentSort={sort} onSort={toggleSort} />
              <SortableTh label="Owner" sortKey="owner" currentSort={sort} onSort={toggleSort} />
              <SortableTh label="Assigned To" sortKey="assigned_to" currentSort={sort} onSort={toggleSort} />
              <SortableTh label="Due" sortKey="due_date" currentSort={sort} onSort={toggleSort} />
              <SortableTh label="Status" sortKey="status" currentSort={sort} onSort={toggleSort} />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {visibleTasks.map((task) => {
              const effectiveDue = effectiveDueOf(task)
              const notDone = task.status !== 'completed'
              const isOverdue = !!effectiveDue && effectiveDue < today && notDone
              const isRedFlagged = !isOverdue && !!effectiveDue && effectiveDue <= redFlagCutoff && notDone
              const canEdit = currentProfile.role === 'admin' || currentProfile.role === 'senior' || canEditTaskStatus(task, currentProfile)
              const allowedStatuses = getAllowedStatuses(task, currentProfile)

              return (
                <tr
                  key={task.id}
                  id={`task-row-${task.id}`}
                  onClick={() => setOpenTaskId(task.id)}
                  className={`cursor-pointer hover:bg-muted/50 ${flashId === task.id ? 'bg-amber-100 transition-colors duration-1000' : ''}`}
                >
                  <td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={selected.has(task.id)} onChange={() => toggleSelected(task.id)} />
                  </td>
                  <td className="px-4 py-2 font-mono font-medium text-foreground">{taskNoById.get(task.id)}</td>
                  <td className="px-4 py-2 text-foreground">
                    {task.action_number && (
                      <span className="mr-2 font-mono text-xs text-muted-foreground">{task.action_number}</span>
                    )}
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
                        onClick={(e) => e.stopPropagation()}
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
                    {isRedFlagged && <span title={`Due within ${RED_FLAG_DAYS} days`}>🚩 </span>}
                    {task.repeats ? `${task.repeats}${task.next_due ? ` · next ${task.next_due}` : ''}` : task.due_date ?? 'Recurring'}
                  </td>
                  <td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
                    <TaskStatusSelect
                      taskId={task.id}
                      status={task.status}
                      allowedStatuses={allowedStatuses}
                      disabled={!canEdit}
                      linkedFindingTitle={task.linked_finding?.title ?? null}
                    />
                  </td>
                </tr>
              )
            })}
            {visibleTasks.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                  No tasks match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <TaskDetailPanel
        task={openTask}
        currentProfile={currentProfile}
        owners={owners}
        categories={categories}
        findings={findings}
        keywords={keywords}
        onClose={() => setOpenTaskId(null)}
      />
    </div>
  )
}
