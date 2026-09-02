-- Threaded comments per task (Staff Docs/further_recs_mockup.html #1). Distinct from the
-- existing tasks.notes column, which is a single overwritable field with no UI to edit it --
-- this is a real append-only conversation thread, several entries, each with an author and a
-- timestamp.
create table task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references tasks(id) on delete cascade,
  author_id uuid references profiles(id),
  body text not null,
  created_at timestamptz default now()
);

alter table task_comments enable row level security;

-- Same visibility as tasks/task_activity (Section 4: team-wide read).
create policy "task_comments_select_all" on task_comments for select using (
  auth.role() = 'authenticated'
);
-- Writes go through app/api/tasks/[id]/comments/route.ts's service-role client, which enforces
-- admin/head/owner only (leadership stays read-only) -- this insert policy is defense-in-depth,
-- not the actual gate, same pattern as task_activity_insert_authenticated (migration 0012).
create policy "task_comments_insert_authenticated" on task_comments for insert with check (
  auth.role() = 'authenticated'
);

grant select, insert on task_comments to authenticated;
grant all privileges on task_comments to service_role;
