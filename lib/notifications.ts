import type { Task, TaskComment } from '@/types'

export type NotificationType =
  | 'assigned'
  | 'deadline-soon'
  | 'overdue'
  | 'status-changed'
  | 'awaiting-your-approval'
  | 'changes-requested'
  | 'new-comment'

export interface Notification {
  type: NotificationType
  taskId: string
  actionNumber: string
  message: string
  // Stable per notification *instance*, not just per (type, task) -- includes whatever
  // timestamp/value changes when a fresh instance of that notification would fire again (e.g.
  // status-changed keys on updated_at, so reading one status change doesn't suppress the next).
  // Used to track read/unread (notification_reads table, migration 0020) since notifications
  // are computed live, not stored rows.
  key: string
}

const DEADLINE_SOON_DAYS = 3
export const RECENTLY_CHANGED_HOURS = 48
// There is no "assigned_at" timestamp (reassignment isn't a built feature yet — CLAUDE.md
// Section 14) and no dedicated reassignment endpoint, so "newly assigned to me" is
// approximated via created_at recency, which only fires for genuinely new tasks.
const RECENTLY_CREATED_DAYS = 7

function daysFromNow(now: Date, days: number): string {
  const d = new Date(now)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export function getNotificationsForUser(
  tasks: Task[],
  comments: TaskComment[],
  userId: string,
  now: Date
): Notification[] {
  const notifications: Notification[] = []
  const today = now.toISOString().slice(0, 10)
  const deadlineCutoff = daysFromNow(now, DEADLINE_SOON_DAYS)
  const recentChangeCutoff = new Date(now.getTime() - RECENTLY_CHANGED_HOURS * 60 * 60 * 1000)
  const recentCreatedCutoff = new Date(now.getTime() - RECENTLY_CREATED_DAYS * 24 * 60 * 60 * 1000)
  const myTaskIds = new Set(
    tasks
      .filter((t) => t.assigned_to === userId || t.co_assigned_to === userId || t.approver_id === userId)
      .map((t) => t.id)
  )
  const taskById = new Map(tasks.map((t) => [t.id, t]))

  for (const comment of comments) {
    if (comment.author_id === userId) continue
    if (!myTaskIds.has(comment.task_id)) continue
    if (new Date(comment.created_at) < recentChangeCutoff) continue
    const task = taskById.get(comment.task_id)
    if (!task) continue
    notifications.push({
      type: 'new-comment',
      taskId: task.id,
      actionNumber: task.action_number,
      message: `${task.action_number} has a new comment`,
      key: `new-comment:${comment.id}`,
    })
  }

  for (const task of tasks) {
    const isMine = task.assigned_to === userId || task.co_assigned_to === userId
    const isApprover = task.approver_id !== null && task.approver_id === userId
    if (!isMine && !isApprover) continue

    if (isApprover && task.status === 'submitted_for_review') {
      notifications.push({
        type: 'awaiting-your-approval',
        taskId: task.id,
        actionNumber: task.action_number,
        message: `${task.action_number} is awaiting your approval`,
        key: `awaiting-your-approval:${task.id}:${task.updated_at}`,
      })
    }

    if (!isMine) continue

    if (task.status === 'changes_requested') {
      notifications.push({
        type: 'changes-requested',
        taskId: task.id,
        actionNumber: task.action_number,
        message: `${task.action_number} has changes requested — take another look`,
        key: `changes-requested:${task.id}:${task.updated_at}`,
      })
    }

    const notDone = task.status !== 'completed'
    // next_due (recurrence, migration 0018) stands in for due_date once it's set.
    const effectiveDue = task.next_due ?? task.due_date

    if (effectiveDue && notDone) {
      if (effectiveDue < today) {
        notifications.push({
          type: 'overdue',
          taskId: task.id,
          actionNumber: task.action_number,
          message: `${task.action_number} is overdue (was due ${effectiveDue})`,
          key: `overdue:${task.id}:${effectiveDue}`,
        })
      } else if (effectiveDue <= deadlineCutoff) {
        notifications.push({
          type: 'deadline-soon',
          taskId: task.id,
          actionNumber: task.action_number,
          message: `${task.action_number} is due ${effectiveDue}`,
          key: `deadline-soon:${task.id}:${effectiveDue}`,
        })
      }
    }

    if (new Date(task.created_at) >= recentCreatedCutoff) {
      notifications.push({
        type: 'assigned',
        taskId: task.id,
        actionNumber: task.action_number,
        message: `You're attached to ${task.action_number}: ${task.title}`,
        key: `assigned:${task.id}:${task.created_at}`,
      })
    }

    if (task.updated_by && task.updated_by !== userId && new Date(task.updated_at) >= recentChangeCutoff) {
      notifications.push({
        type: 'status-changed',
        taskId: task.id,
        actionNumber: task.action_number,
        message: `${task.action_number}'s status changed to "${task.status.replace('_', ' ')}"`,
        key: `status-changed:${task.id}:${task.updated_at}`,
      })
    }
  }

  return notifications
}
