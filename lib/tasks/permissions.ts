import type { Profile, Task, TaskStatus } from '@/types'

const ALL_STATUSES: TaskStatus[] = ['pending', 'in_progress', 'on_hold', 'completed']
// Whoever holds Assigned To (anyone, including a reviewer-role profile -- see below) can
// move a task through its working states, but only the Owner can mark it Completed.
const NON_COMPLETION_STATUSES: TaskStatus[] = ['pending', 'in_progress', 'on_hold']

type TaskForPermissions = Pick<Task, 'owner_id' | 'assigned_to_id'>
type ProfileForPermissions = Pick<Profile, 'id' | 'role'>

// Statuses this profile may set on this task via the normal status control.
// - admin/senior: full freedom (senior is the near-admin tier, renamed from 'head' 3 Sep 2026)
// - the task's Owner: full freedom, including Completed -- only the Owner can complete a task
// - the task's current Assigned To: everything except Completed. No role gate here beyond
//   admin/senior above -- this deliberately includes a reviewer-role profile (e.g. Adeela),
//   the same kind of carve-out the old approver role had, even though reviewer is otherwise
//   restricted to only the Tasks page (CLAUDE.md Section 4).
// - anyone else: no options
export function getAllowedStatuses(task: TaskForPermissions, profile: ProfileForPermissions): TaskStatus[] {
  if (profile.role === 'admin' || profile.role === 'senior') return ALL_STATUSES
  if (profile.id === task.owner_id) return ALL_STATUSES
  if (profile.id === task.assigned_to_id) return NON_COMPLETION_STATUSES
  return []
}

export function canEditTaskStatus(task: TaskForPermissions, profile: ProfileForPermissions): boolean {
  if (profile.role === 'admin' || profile.role === 'senior') return true
  return profile.id === task.owner_id || profile.id === task.assigned_to_id
}
