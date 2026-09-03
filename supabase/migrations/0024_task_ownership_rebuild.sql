-- Phase 2 of the Task Tracker/Quarter overhaul (CLAUDE.md Section 14, confirmed with Abdullah
-- 2 Sep 2026): rebuilds the task ownership/workflow model.
--
-- Removes Co-Owner and the entire approval workflow (approver_id, submitted_for_review,
-- changes_requested -- built 1 Sep 2026, migration 0015_task_approval.sql), replacing both
-- with a two-tier model: Owner (renamed from the old "Assigned to" field, restricted at the
-- app layer to exactly Tabish Khalid / Syed Ali / Najma Furqan -- lib/tasks/constants.ts) and
-- a new Assigned To field (whoever's doing the hands-on work right now, open to any profile,
-- including leadership-role people who are otherwise read-only everywhere else in the app).

-- 1. New columns.
alter table tasks add column assigned_to_id uuid references profiles(id);
alter table tasks add column deadline date;

-- 2. Backfill assigned_to_id BEFORE reassigning owners (step 3), since the fallback case
--    needs the OLD (pre-reassignment) owner value: co-owner if one was set, else the outgoing
--    owner themselves, so their involvement on the task isn't silently dropped. A task whose
--    owner already stays put and had no co-owner ends up self-assigned, which is correct too.
update tasks set assigned_to_id = coalesce(co_assigned_to, assigned_to);

-- 3. Owner reassignment (confirmed counts from supabase/seed.sql as of 2 Sep 2026: Talha 17,
--    Hameed 9, Usman 9 -> Tabish; Lavi 6 -> Najma. Tabish/Najma/Syed Ali keep their own tasks
--    as owner, unchanged).
update tasks set assigned_to = (select id from profiles where full_name = 'Tabish Khalid')
  where assigned_to = (select id from profiles where full_name = 'Talha Azeem');
update tasks set assigned_to = (select id from profiles where full_name = 'Tabish Khalid')
  where assigned_to = (select id from profiles where full_name = 'Hameed Ishaq');
update tasks set assigned_to = (select id from profiles where full_name = 'Tabish Khalid')
  where assigned_to = (select id from profiles where full_name = 'Usman Ali');
update tasks set assigned_to = (select id from profiles where full_name = 'Najma Furqan')
  where assigned_to = (select id from profiles where full_name = 'Lavi Shamoon');

-- 4. Rename assigned_to -> owner_id now that it holds only the 3 eligible owners. Eligibility
--    itself is enforced at the app layer, not a DB constraint -- profiles are editable data,
--    and a hardcoded UUID check here would silently stop matching if any of the 3 were ever
--    recreated (e.g. a deactivate + re-invite).
alter table tasks rename column assigned_to to owner_id;

-- 5. Drop Co-Owner and the whole approval workflow. The old tasks_update_owner RLS policy
--    (migration 0002) references co_assigned_to in its USING clause, so it must be dropped
--    before that column can be -- Postgres refuses to drop a column a policy still depends on
--    (error 2BP01). It's replaced in step 9 below with the new ownership-model policies.
drop policy if exists "tasks_update_owner" on tasks;
alter table tasks drop column co_assigned_to;
alter table tasks drop column approver_id;

-- 6. Deadline must never be later than Due date -- enforced here in addition to client/API
--    validation, since this is a data-integrity rule, not just a UX nicety.
alter table tasks add constraint tasks_deadline_before_due
  check (deadline is null or due_date is null or deadline <= due_date);

-- 7. Status: 7 values down to 4 (pending, in_progress, on_hold, completed). Remap existing
--    data before swapping the CHECK constraint, since old values wouldn't satisfy the new one:
--    blocked -> on_hold; submitted_for_review/changes_requested (the now-removed approval
--    workflow) -> in_progress; overdue -> whichever of pending/in_progress the task's real
--    work state actually was, read from task_activity (was it ever explicitly moved to
--    in_progress?), falling back to pending if not -- not a blanket single target.
update tasks set status = 'on_hold' where status = 'blocked';
update tasks set status = 'in_progress' where status in ('submitted_for_review', 'changes_requested');
update tasks set status = (
  case when exists (
    select 1 from task_activity
    where task_activity.task_id = tasks.id and field = 'status' and new_value = 'in_progress'
  ) then 'in_progress' else 'pending' end
) where status = 'overdue';

alter table tasks drop constraint if exists tasks_status_check;
alter table tasks add constraint tasks_status_check
  check (status in ('pending', 'in_progress', 'on_hold', 'completed'));

-- 8. task_categories: admin-CRUD table (the CRUD UI itself lands in Phase 4) replacing
--    free-text tasks.category. Auto-seeded with the 11 values already in use across the
--    September sprint (Staff Docs/All tasks sheet.xlsx).
create table task_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz default now()
);

insert into task_categories (name) values
  ('Service Pages'), ('Location Pages'), ('New Blogs'), ('Blog Revamp'), ('Proofreading'),
  ('Publishing'), ('Design / Images'), ('Technical SEO'), ('Website'), ('Links'), ('Off-Page SEO');

alter table task_categories enable row level security;
create policy "task_categories_select_all" on task_categories for select using (
  auth.role() = 'authenticated'
);
create policy "task_categories_write_admin" on task_categories for all using (
  current_role_name() = 'admin'
) with check (current_role_name() = 'admin');

grant select on task_categories to authenticated;
grant all privileges on task_categories to service_role;

alter table tasks add column category_id uuid references task_categories(id);
update tasks set category_id = (select id from task_categories where name = tasks.category);
alter table tasks drop column category;

-- 9. RLS: mirror the new ownership model. An 'owner'-role profile may update a task where
--    they are its owner OR its current assignee; a 'leadership'-role profile (normally
--    read-only everywhere else, CLAUDE.md Section 4) gets the same carve-out specifically
--    when they are the current assignee -- the same kind of exception the old approver role
--    had. (The task API routes use the service-role client and enforce this in the app layer
--    too -- lib/tasks/permissions.ts -- this is defense-in-depth, same as tasks_delete_admin,
--    migration 0008.) The old tasks_update_owner policy was already dropped in step 5, before
--    co_assigned_to was dropped.
create policy "tasks_update_owner" on tasks for update using (
  current_role_name() = 'owner' and (owner_id = auth.uid() or assigned_to_id = auth.uid())
);
create policy "tasks_update_assigned_leadership" on tasks for update using (
  current_role_name() = 'leadership' and assigned_to_id = auth.uid()
);
