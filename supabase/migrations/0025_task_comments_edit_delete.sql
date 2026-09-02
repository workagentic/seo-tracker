-- Phase 3 of the Task Tracker overhaul (CLAUDE.md Section 14): comments become
-- editable/deletable by their own author (admin can moderate any comment too), a change from
-- the append-only design task_comments shipped with (migration 0016). Soft-delete rather than
-- a hard DELETE, so a deleted comment leaves a "[comment deleted]" placeholder in the thread
-- instead of vanishing (and a re-numbered/confusing thread for anyone already reading it).
alter table task_comments add column edited_at timestamptz;
alter table task_comments add column deleted_at timestamptz;

-- Previously insert-only (0016_task_comments.sql only granted/policied select+insert). Author
-- can update/soft-delete their own comment; admin can moderate any. Same "defense-in-depth,
-- not the actual gate" caveat as the insert policy -- the real write path is
-- app/api/tasks/[id]/comments/[commentId]/route.ts's service-role client, which enforces this.
create policy "task_comments_update_own_or_admin" on task_comments for update using (
  author_id = auth.uid() or current_role_name() = 'admin'
);
grant update on task_comments to authenticated;
