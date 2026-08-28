-- CLAUDE.md Section 8.3's "Activity log (status changes with timestamp + who changed it)" —
-- previously only tasks.updated_by/updated_at (migration 0005) tracked the *last* change.
-- This records every change as its own row.
create table task_activity (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references tasks(id) on delete cascade,
  changed_by uuid references profiles(id),
  field text not null,       -- e.g. 'status', 'notes', 'assigned_to', 'due_date'
  old_value text,
  new_value text,
  created_at timestamptz default now()
);

alter table task_activity enable row level security;

-- Same visibility as tasks itself (Section 4: "All roles can SELECT all tasks").
create policy "task_activity_select_all" on task_activity for select using (
  auth.role() = 'authenticated'
);
-- Writes always go through app/api/tasks/[id]/route.ts's service-role client, which already
-- enforces who can change what before ever writing an activity row -- this insert policy is
-- defense-in-depth, not the actual gate.
create policy "task_activity_insert_authenticated" on task_activity for insert with check (
  auth.role() = 'authenticated'
);

grant select, insert on task_activity to authenticated;
grant all privileges on task_activity to service_role;
