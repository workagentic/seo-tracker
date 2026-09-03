import type { Task, TaskComment } from '@/types'

export type NotificationType =
  | 'assigned'
  | 'deadline-soon'
  | 'overdue'
  | 'status-changed'
  | 'new-comment'
  | 'mentioned'

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
// There is no "assigned_at" timestamp, so "newly assigned to me" is approximated via
// created_at recency, which only fires for a genuinely new task. Known gap (CLAUDE.md Section
// 14 Phase 2): a mid-life reassignment (assigned_to_id changing on an existing task, now a
// core operation in the new ownership model) doesn't notify the new assignee here -- doing
// that properly needs task_activity entries in this function's inputs, not just `tasks`.
const RECENTLY_CREATED_DAYS = 7

function daysFromNow(now: Date, days: number): string {
  const d = new Date(now)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

// action_number is nullable since 3 Sep 2026 (removed from the New Task form) -- every
// message here falls back to the title so a codeless task still reads sensibly.
function taskLabel(task: Task): string {
  return task.action_number ?? task.title
}

export function getNotificationsForUser(
  tasks: Task[],
  comments: TaskComment[],
  userId: string,
  now: Date,
  // Own full name, used only to detect an "@Full Name" mention in a comment (Section 14 Phase
  // 3). Optional so existing call sites/tests that don't care about mentions keep working.
  userFullName?: string | null
): Notification[] {
  const notifications: Notification[] = []
  const today = now.toISOString().slice(0, 10)
  const deadlineCutoff = daysFromNow(now, DEADLINE_SOON_DAYS)
  const recentChangeCutoff = new Date(now.getTime() - RECENTLY_CHANGED_HOURS * 60 * 60 * 1000)
  const recentCreatedCutoff = new Date(now.getTime() - RECENTLY_CREATED_DAYS * 24 * 60 * 60 * 1000)
  const myTaskIds = new Set(
    tasks.filter((t) => t.owner_id === userId || t.assigned_to_id === userId).map((t) => t.id)
  )
  const taskById = new Map(tasks.map((t) => [t.id, t]))

  for (const comment of comments) {
    if (comment.author_id === userId || comment.deleted_at) continue
    if (new Date(comment.created_at) < recentChangeCutoff) continue
    const task = taskById.get(comment.task_id)
    if (!task) continue

    // Independent of new-comment below: fires for ANY comment mentioning this user, not just
    // ones on a task they're attached to (new-comment is scoped to myTaskIds; mentions aren't).
    if (userFullName && comment.body.includes(`@${userFullName}`)) {
      notifications.push({
        type: 'mentioned',
        taskId: task.id,
        actionNumber: taskLabel(task),
        message: `You were mentioned on ${taskLabel(task)}`,
        key: `mentioned:${comment.id}`,
      })
    }

    if (!myTaskIds.has(comment.task_id)) continue
    notifications.push({
      type: 'new-comment',
      taskId: task.id,
      actionNumber: taskLabel(task),
      message: `${taskLabel(task)} has a new comment`,
      key: `new-comment:${comment.id}`,
    })
  }

  for (const task of tasks) {
    const isMine = task.owner_id === userId || task.assigned_to_id === userId
    if (!isMine) continue

    const notDone = task.status !== 'completed'
    // next_due (recurrence, migration 0018) stands in for due_date once it's set.
    const effectiveDue = task.next_due ?? task.due_date

    if (effectiveDue && notDone) {
      if (effectiveDue < today) {
        notifications.push({
          type: 'overdue',
          taskId: task.id,
          actionNumber: taskLabel(task),
          message: `${taskLabel(task)} is overdue (was due ${effectiveDue})`,
          key: `overdue:${task.id}:${effectiveDue}`,
        })
      } else if (effectiveDue <= deadlineCutoff) {
        notifications.push({
          type: 'deadline-soon',
          taskId: task.id,
          actionNumber: taskLabel(task),
          message: `${taskLabel(task)} is due ${effectiveDue}`,
          key: `deadline-soon:${task.id}:${effectiveDue}`,
        })
      }
    }

    if (new Date(task.created_at) >= recentCreatedCutoff) {
      // Avoid "You're attached to <title>: <title>" when there's no action_number to lead with.
      const message = task.action_number
        ? `You're attached to ${task.action_number}: ${task.title}`
        : `You're attached to ${task.title}`
      notifications.push({
        type: 'assigned',
        taskId: task.id,
        actionNumber: taskLabel(task),
        message,
        key: `assigned:${task.id}:${task.created_at}`,
      })
    }

    if (task.updated_by && task.updated_by !== userId && new Date(task.updated_at) >= recentChangeCutoff) {
      notifications.push({
        type: 'status-changed',
        taskId: task.id,
        actionNumber: taskLabel(task),
        message: `${taskLabel(task)}'s status changed to "${task.status.replace('_', ' ')}"`,
        key: `status-changed:${task.id}:${task.updated_at}`,
      })
    }
  }

  return notifications
}
