-- Approval workflow (Staff Docs/approval_mockup.html): an optional Approver on a task, plus a
-- review step in the status pipeline. Opt-in per task via approver_id -- leaving it null keeps
-- today's behavior (owner can self-complete) exactly as-is.
--
-- Only 2 new status values are needed. "Approved" is not one of them -- clicking Approve writes
-- 'completed' directly (recorded via the existing task_activity log + completed_at). Clicking
-- "Request changes" does persist as 'changes_requested' and rests there until the doer moves it.
alter table tasks add column approver_id uuid references profiles(id);

alter table tasks drop constraint if exists tasks_status_check;
alter table tasks add constraint tasks_status_check check (
  status in (
    'pending', 'in_progress', 'completed', 'blocked', 'overdue',
    'submitted_for_review', 'changes_requested'
  )
);
