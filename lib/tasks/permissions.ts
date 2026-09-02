import type { Profile, Task, TaskStatus } from '@/types'

const ALL_STATUSES: TaskStatus[] = ['pending', 'in_progress', 'on_hold', 'completed']
// Whoever holds Assigned To (anyone, including a leadership-role profile -- see below) can
// move a task through its working states, but only the Owner can mark it Completed.
const NON_COMPLETION_STATUSES: TaskStatus[] = ['pending', 'in_progress', 'on_hold']

type TaskForPermissions = Pick<Task, 'owner_id' | 'assigned_to_id'>
type ProfileForPermissions = Pick<Profile, 'id' | 'role'>

// Statuses this profile may set on this task via the normal status control.
// - admin/head: full freedom (unchanged)
// - the task's Owner: full freedom, including Completed -- only the Owner can complete a task
// - the task's current Assigned To: everything except Completed. No role gate here beyond
//   admin/head above -- this deliberately includes a leadership-role profile (e.g. Adeela),
//   the same kind of carve-out the old approver role had, even though leadership stays
//   read-only everywhere else in the app (CLAUDE.md Section 4).
// - anyone else: no options
export function getAllowedStatuses(task: TaskForPermissions, profile: ProfileForPermissions): TaskStatus[] {
  if (profile.role === 'admin' || profile.role === 'head') return ALL_STATUSES
  if (profile.id === task.owner_id) return ALL_STATUSES
  if (profile.id === task.assigned_to_id) return NON_COMPLETION_STATUSES
  return []
}

export function canEditTaskStatus(task: TaskForPermissions, profile: ProfileForPermissions): boolean {
  if (profile.role === 'admin' || profile.role === 'head') return true
  return profile.id === task.owner_id || profile.id === task.assigned_to_id
}
