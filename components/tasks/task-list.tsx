import type { Profile, Task } from '@/types'
import { TaskStatusSelect } from './task-status-select'

export function TaskList({ tasks, currentProfile }: { tasks: Task[]; currentProfile: Profile }) {
  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="overflow-hidden rounded-md border bg-white">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
          <tr>
            <th className="px-4 py-2">Action</th>
            <th className="px-4 py-2">Title</th>
            <th className="px-4 py-2">Owner</th>
            <th className="px-4 py-2">Co-owner</th>
            <th className="px-4 py-2">Due</th>
            <th className="px-4 py-2">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {tasks.map((task) => {
            const isOverdue = !!task.due_date && task.due_date < today && task.status !== 'completed'
            const canEdit =
              currentProfile.role === 'admin' ||
              currentProfile.role === 'head' ||
              (currentProfile.role === 'owner' &&
                (task.assigned_to === currentProfile.id || task.co_assigned_to === currentProfile.id))

            return (
              <tr key={task.id}>
                <td className="px-4 py-2 font-medium text-slate-700">{task.action_number}</td>
                <td className="px-4 py-2 text-slate-900">{task.title}</td>
                <td className="px-4 py-2 text-slate-600">{task.assigned_profile?.full_name ?? '—'}</td>
                <td className="px-4 py-2 text-slate-600">{task.co_assigned_profile?.full_name ?? '—'}</td>
                <td className={`px-4 py-2 ${isOverdue ? 'font-medium text-red-600' : 'text-slate-600'}`}>
                  {task.due_date ?? 'Recurring'}
                </td>
                <td className="px-4 py-2">
                  <TaskStatusSelect taskId={task.id} status={task.status} disabled={!canEdit} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
