'use client'

import { useMemo, useState } from 'react'
import type { Profile, Task } from '@/types'
import { TaskStatusSelect } from './task-status-select'
import { TaskFormDialog } from './task-form-dialog'
import { DeleteTaskButton } from './delete-task-button'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SortableTh, compareValues, type SortState } from '@/components/ui/sortable-th'

function sortValue(task: Task, key: string): unknown {
  switch (key) {
    case 'action_number': return task.action_number
    case 'title': return task.title
    case 'owner': return task.assigned_profile?.full_name ?? null
    case 'co_owner': return task.co_assigned_profile?.full_name ?? null
    case 'due_date': return task.due_date
    case 'status': return task.status
    default: return null
  }
}

export function TaskList({
  tasks,
  currentProfile,
  owners,
}: {
  tasks: Task[]
  currentProfile: Profile
  owners: { id: string; full_name: string }[]
}) {
  const today = new Date().toISOString().slice(0, 10)
  const isAdmin = currentProfile.role === 'admin'
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortState | null>(null)

  const visibleTasks = useMemo(() => {
    const q = search.trim().toLowerCase()
    let result = tasks
    if (q) {
      result = tasks.filter((t) =>
        [t.action_number, t.title, t.assigned_profile?.full_name, t.co_assigned_profile?.full_name]
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

  return (
    <div>
      <Input
        placeholder="Search tasks…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-3 max-w-sm"
      />
      <div className="overflow-hidden rounded-md border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs font-medium uppercase text-muted-foreground">
            <tr>
              <SortableTh label="Action" sortKey="action_number" currentSort={sort} onSort={toggleSort} />
              <SortableTh label="Title" sortKey="title" currentSort={sort} onSort={toggleSort} />
              <SortableTh label="Owner" sortKey="owner" currentSort={sort} onSort={toggleSort} />
              <SortableTh label="Co-owner" sortKey="co_owner" currentSort={sort} onSort={toggleSort} />
              <SortableTh label="Due" sortKey="due_date" currentSort={sort} onSort={toggleSort} />
              <SortableTh label="Status" sortKey="status" currentSort={sort} onSort={toggleSort} />
              {isAdmin && <th className="px-4 py-2" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {visibleTasks.map((task) => {
              const isOverdue = !!task.due_date && task.due_date < today && task.status !== 'completed'
              const canEdit =
                currentProfile.role === 'admin' ||
                currentProfile.role === 'head' ||
                (currentProfile.role === 'owner' &&
                  (task.assigned_to === currentProfile.id || task.co_assigned_to === currentProfile.id))

              return (
                <tr key={task.id} className="hover:bg-muted/50">
                  <td className="px-4 py-2 font-mono font-medium text-foreground">{task.action_number}</td>
                  <td className="px-4 py-2 text-foreground">{task.title}</td>
                  <td className="px-4 py-2 text-muted-foreground">{task.assigned_profile?.full_name ?? '—'}</td>
                  <td className="px-4 py-2 text-muted-foreground">{task.co_assigned_profile?.full_name ?? '—'}</td>
                  <td className={`px-4 py-2 font-mono ${isOverdue ? 'font-medium text-red-600' : 'text-muted-foreground'}`}>
                    {task.due_date ?? 'Recurring'}
                  </td>
                  <td className="px-4 py-2">
                    <TaskStatusSelect taskId={task.id} status={task.status} disabled={!canEdit} />
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-2">
                      <div className="flex gap-1">
                        <TaskFormDialog owners={owners} task={task} trigger={<Button variant="ghost" size="sm">Edit</Button>} />
                        <DeleteTaskButton taskId={task.id} actionNumber={task.action_number} />
                      </div>
                    </td>
                  )}
                </tr>
              )
            })}
            {visibleTasks.length === 0 && (
              <tr>
                <td colSpan={isAdmin ? 7 : 6} className="px-4 py-6 text-center text-muted-foreground">
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
