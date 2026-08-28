import type { Profile, Task } from '@/types'
import { TaskStatusSelect } from './task-status-select'
import { TaskFormDialog } from './task-form-dialog'
import { DeleteTaskButton } from './delete-task-button'
import { Button } from '@/components/ui/button'

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

  return (
    <div className="overflow-hidden rounded-md border border-border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-muted text-left text-xs font-medium uppercase text-muted-foreground">
          <tr>
            <th className="px-4 py-2">Action</th>
            <th className="px-4 py-2">Title</th>
            <th className="px-4 py-2">Owner</th>
            <th className="px-4 py-2">Co-owner</th>
            <th className="px-4 py-2">Due</th>
            <th className="px-4 py-2">Status</th>
            {isAdmin && <th className="px-4 py-2" />}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {tasks.map((task) => {
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
        </tbody>
      </table>
    </div>
  )
}
