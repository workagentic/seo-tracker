import type { Task } from '@/types'

export type NotificationType = 'assigned' | 'deadline-soon' | 'overdue' | 'status-changed'

export interface Notification {
  type: NotificationType
  taskId: string
  actionNumber: string
  message: string
}

const DEADLINE_SOON_DAYS = 3
const RECENTLY_CHANGED_HOURS = 48
// There is no "assigned_at" timestamp (reassignment isn't a built feature yet — CLAUDE.md
// Section 14) and no dedicated reassignment endpoint, so "newly assigned to me" is
// approximated via created_at recency, which only fires for genuinely new tasks.
const RECENTLY_CREATED_DAYS = 7

function daysFromNow(now: Date, days: number): string {
  const d = new Date(now)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export function getNotificationsForUser(tasks: Task[], userId: string, now: Date): Notification[] {
  const notifications: Notification[] = []
  const today = now.toISOString().slice(0, 10)
  const deadlineCutoff = daysFromNow(now, DEADLINE_SOON_DAYS)
  const recentChangeCutoff = new Date(now.getTime() - RECENTLY_CHANGED_HOURS * 60 * 60 * 1000)
  const recentCreatedCutoff = new Date(now.getTime() - RECENTLY_CREATED_DAYS * 24 * 60 * 60 * 1000)

  for (const task of tasks) {
    const isMine = task.assigned_to === userId || task.co_assigned_to === userId
    if (!isMine) continue

    const notDone = task.status !== 'completed'

    if (task.due_date && notDone) {
      if (task.due_date < today) {
        notifications.push({
          type: 'overdue',
          taskId: task.id,
          actionNumber: task.action_number,
          message: `${task.action_number} is overdue (was due ${task.due_date})`,
        })
      } else if (task.due_date <= deadlineCutoff) {
        notifications.push({
          type: 'deadline-soon',
          taskId: task.id,
          actionNumber: task.action_number,
          message: `${task.action_number} is due ${task.due_date}`,
        })
      }
    }

    if (new Date(task.created_at) >= recentCreatedCutoff) {
      notifications.push({
        type: 'assigned',
        taskId: task.id,
        actionNumber: task.action_number,
        message: `You're attached to ${task.action_number}: ${task.title}`,
      })
    }

    if (task.updated_by && task.updated_by !== userId && new Date(task.updated_at) >= recentChangeCutoff) {
      notifications.push({
        type: 'status-changed',
        taskId: task.id,
        actionNumber: task.action_number,
        message: `${task.action_number}'s status changed to "${task.status.replace('_', ' ')}"`,
      })
    }
  }

  return notifications
}
