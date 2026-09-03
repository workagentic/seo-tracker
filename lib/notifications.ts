import type { Task, TaskActivity, TaskComment } from '@/types'

export type NotificationType =
  | 'assigned'
  | 'deadline-soon'
  | 'overdue'
  | 'status-changed'
  | 'reassigned'
  | 'notes-updated'
  | 'new-comment'
  | 'mentioned'

export interface Notification {
  type: NotificationType
  taskId: string
  actionNumber: string
  message: string
  // Stable per notification *instance*, not just per (type, task) -- includes whatever
  // timestamp/id changes when a fresh instance of that notification would fire again (e.g.
  // status-changed/reassigned/notes-updated key on their source task_activity row's own id,
  // so reading one change doesn't suppress the next). Used to track read/unread
  // (notification_reads table, migration 0020) since notifications are computed live, not
  // stored rows.
  key: string
}

const DEADLINE_SOON_DAYS = 3
export const RECENTLY_CHANGED_HOURS = 48
// There is no "assigned_at" timestamp, so "newly assigned to me" (a genuinely NEW task) is
// approximated via created_at recency. A mid-life reassignment on an existing task is a
// different case, covered separately below by the 'reassigned' notification (which is driven
// by task_activity and does reach the new assignee, closing what used to be a known gap here
// -- CLAUDE.md Section 14 follow-up, 3 Sep 2026).
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
  // Recent task_activity rows (CLAUDE.md Section 14 follow-up, 3 Sep 2026) -- replaces the old
  // task.updated_by/updated_at heuristic, which fired a "status changed" notification for ANY
  // field change (notes, reassignment, ...), even when status itself hadn't moved. Activity is
  // per-field (one row per changed field per PATCH -- lib/tasks/activity.ts), so each
  // notification below can now say accurately what actually changed.
  activity: TaskActivity[],
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

  }

  // Owner (and, same as everywhere else in this list, the current Assigned To) gets a
  // specific notification per changed field, whenever someone else -- most often the assigned
  // expert working the task day to day -- changes status, reassigns it, or updates notes on a
  // task they own or are attached to (confirmed with Abdullah 3 Sep 2026). Deadline-only
  // changes are deliberately not surfaced here -- in practice they're set together with
  // assigned_to_id as part of one reassignment (already covered below), and a standalone
  // deadline edit is rare enough not to be worth a fifth notification type.
  for (const entry of activity) {
    if (!entry.changed_by || entry.changed_by === userId) continue
    if (new Date(entry.created_at) < recentChangeCutoff) continue
    const task = taskById.get(entry.task_id)
    if (!task || !myTaskIds.has(entry.task_id)) continue

    if (entry.field === 'status') {
      const label = (entry.new_value ?? '').replace(/_/g, ' ')
      notifications.push({
        type: 'status-changed',
        taskId: task.id,
        actionNumber: taskLabel(task),
        message: `${taskLabel(task)}'s status changed to "${label}"`,
        key: `status-changed:${entry.id}`,
      })
    } else if (entry.field === 'assigned_to_id') {
      notifications.push({
        type: 'reassigned',
        taskId: task.id,
        actionNumber: taskLabel(task),
        message: `${taskLabel(task)} was reassigned`,
        key: `reassigned:${entry.id}`,
      })
    } else if (entry.field === 'notes') {
      notifications.push({
        type: 'notes-updated',
        taskId: task.id,
        actionNumber: taskLabel(task),
        message: `${taskLabel(task)}'s notes were updated`,
        key: `notes-updated:${entry.id}`,
      })
    }
  }

  return notifications
}
