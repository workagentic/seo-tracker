import type { Profile, Task, TaskStatus } from '@/types'

const ALL_STATUSES: TaskStatus[] = ['pending', 'in_progress', 'on_hold', 'completed']
// The current Assigned To (expert or reviewer -- see below) only ever gets these two working
// states. 'on_hold' was dropped from this set 3 Sep 2026 (CLAUDE.md Section 14 follow-up) --
// only the Owner (or admin/senior) can now put a task on hold, which is what makes the lock
// below coherent: on_hold becomes reachable only through an Owner/admin/senior action.
const ASSIGNEE_STATUSES: TaskStatus[] = ['pending', 'in_progress']
// Once a task is Completed or On Hold, it's locked for anyone but the Owner (or admin/senior)
// -- the current Assigned To loses all control (status, reassign, notes, comments -- see
// canCommentOnTask below) until the Owner moves it back to pending/in_progress.
const LOCKED_STATUSES: TaskStatus[] = ['completed', 'on_hold']

type TaskForPermissions = Pick<Task, 'owner_id' | 'assigned_to_id' | 'status'>
type ProfileForPermissions = Pick<Profile, 'id' | 'role'>

// Statuses this profile may set on this task via the normal status control.
// - admin/senior: full freedom (senior is the near-admin tier, renamed from 'head' 3 Sep 2026)
// - the task's Owner: full freedom, including Completed -- only the Owner can complete a task
// - the task's current Assigned To: pending/in_progress only, and only while the task isn't
//   already locked (Completed/On Hold -- CLAUDE.md Section 14 follow-up, 3 Sep 2026). No role
//   gate here beyond admin/senior above -- this deliberately includes a reviewer-role profile
//   (e.g. Adeela), the same kind of carve-out the old approver role had, even though reviewer
//   is otherwise restricted to only the Tasks page (CLAUDE.md Section 4).
// - anyone else: no options
export function getAllowedStatuses(task: TaskForPermissions, profile: ProfileForPermissions): TaskStatus[] {
  if (profile.role === 'admin' || profile.role === 'senior') return ALL_STATUSES
  if (profile.id === task.owner_id) return ALL_STATUSES
  if (profile.id === task.assigned_to_id) {
    if (LOCKED_STATUSES.includes(task.status)) return []
    return ASSIGNEE_STATUSES
  }
  return []
}

export function canEditTaskStatus(task: TaskForPermissions, profile: ProfileForPermissions): boolean {
  if (profile.role === 'admin' || profile.role === 'senior') return true
  if (profile.id === task.owner_id) return true
  if (profile.id === task.assigned_to_id) return !LOCKED_STATUSES.includes(task.status)
  return false
}

// Whether this profile can post a NEW comment (or edit/delete their own) on this task right
// now. Ordinarily any role can comment on any task (team-wide visibility); once the task is
// locked (Completed/On Hold), only the Owner and admin/senior retain that -- everyone else,
// including a bystander expert with no assignment on the task, is shut out until the Owner
// unlocks it (CLAUDE.md Section 14 follow-up, 3 Sep 2026).
export function canCommentOnTask(task: TaskForPermissions, profile: ProfileForPermissions): boolean {
  if (profile.role === 'admin' || profile.role === 'senior') return true
  if (profile.id === task.owner_id) return true
  return !LOCKED_STATUSES.includes(task.status)
}
