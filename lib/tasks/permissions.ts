import type { Profile, Task, TaskStatus } from '@/types'

const ALL_STATUSES: TaskStatus[] = [
  'pending',
  'in_progress',
  'completed',
  'blocked',
  'overdue',
  'submitted_for_review',
  'changes_requested',
]

const OWNER_STATUSES_NO_APPROVER: TaskStatus[] = ['pending', 'in_progress', 'completed', 'blocked', 'overdue']

// Ceiling is submitted_for_review once an approver is set -- the owner can no longer
// self-complete, and can't set changes_requested (that's the approver's call).
const OWNER_STATUSES_WITH_APPROVER: TaskStatus[] = ['pending', 'in_progress', 'blocked', 'overdue', 'submitted_for_review']

const APPROVER_ACTIONS: TaskStatus[] = ['completed', 'changes_requested']

type TaskForPermissions = Pick<Task, 'assigned_to' | 'co_assigned_to' | 'approver_id' | 'status'>
type ProfileForPermissions = Pick<Profile, 'id' | 'role'>

// Statuses this profile may set on this task via the normal status control. Admin/head keep
// today's blanket freedom; everyone else's options depend on whether they're the task's
// owner, its approver, or (rarely) both -- see CLAUDE.md's approval-workflow section.
export function getAllowedStatuses(task: TaskForPermissions, profile: ProfileForPermissions): TaskStatus[] {
  if (profile.role === 'admin' || profile.role === 'head') return ALL_STATUSES
  // Leadership is read-only everywhere else in the app (CLAUDE.md Section 4) -- that holds
  // here too, even on a task where they happen to be listed as owner or approver.
  if (profile.role !== 'owner') return []

  const isOwner = profile.id === task.assigned_to || profile.id === task.co_assigned_to
  const isApprover = task.approver_id !== null && profile.id === task.approver_id

  const allowed = new Set<TaskStatus>()
  if (isOwner) {
    for (const s of task.approver_id ? OWNER_STATUSES_WITH_APPROVER : OWNER_STATUSES_NO_APPROVER) allowed.add(s)
  }
  if (isApprover && task.status === 'submitted_for_review') {
    for (const s of APPROVER_ACTIONS) allowed.add(s)
  }
  return Array.from(allowed)
}

export function canEditTaskStatus(task: TaskForPermissions, profile: ProfileForPermissions): boolean {
  if (profile.role === 'admin' || profile.role === 'head') return true
  if (profile.role !== 'owner') return false
  const isOwner = profile.id === task.assigned_to || profile.id === task.co_assigned_to
  const isApprover = task.approver_id !== null && profile.id === task.approver_id
  return isOwner || isApprover
}
