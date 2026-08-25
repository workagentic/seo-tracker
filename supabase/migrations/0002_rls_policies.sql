alter table profiles enable row level security;
alter table tasks enable row level security;
alter table metric_snapshots enable row level security;
alter table competitors enable row level security;
alter table tracked_keywords enable row level security;
alter table keyword_history enable row level security;
alter table audit_reports enable row level security;
alter table weekly_reports enable row level security;

create or replace function current_role_name() returns text as $$
  select role from profiles where id = auth.uid();
$$ language sql stable security definer;

-- profiles: everyone authenticated can read all profiles (needed for owner names/avatars)
create policy "profiles_select_all" on profiles for select using (auth.role() = 'authenticated');
create policy "profiles_update_admin" on profiles for update using (current_role_name() = 'admin');
create policy "profiles_insert_admin" on profiles for insert with check (current_role_name() = 'admin');

-- tasks: all authenticated roles can read all tasks
create policy "tasks_select_all" on tasks for select using (auth.role() = 'authenticated');
-- owner can update only their own (assigned or co-assigned) tasks
create policy "tasks_update_owner" on tasks for update using (
  current_role_name() = 'owner' and (assigned_to = auth.uid() or co_assigned_to = auth.uid())
);
-- admin/head can update any task
create policy "tasks_update_admin_head" on tasks for update using (
  current_role_name() in ('admin', 'head')
);
create policy "tasks_insert_admin_head" on tasks for insert with check (
  current_role_name() in ('admin', 'head')
);

-- metric_snapshots: all authenticated can read; only admin/head can write
create policy "snapshots_select_all" on metric_snapshots for select using (auth.role() = 'authenticated');
create policy "snapshots_insert_admin_head" on metric_snapshots for insert with check (
  current_role_name() in ('admin', 'head')
);

-- competitors: all authenticated can read; admin can write
create policy "competitors_select_all" on competitors for select using (auth.role() = 'authenticated');
create policy "competitors_write_admin" on competitors for all using (
  current_role_name() = 'admin'
) with check (current_role_name() = 'admin');

-- tracked_keywords: all authenticated can read; admin/head can write
create policy "keywords_select_all" on tracked_keywords for select using (auth.role() = 'authenticated');
create policy "keywords_write_admin_head" on tracked_keywords for all using (
  current_role_name() in ('admin', 'head')
) with check (current_role_name() in ('admin', 'head'));

-- keyword_history: all authenticated can read; admin/head can write
create policy "keyword_history_select_all" on keyword_history for select using (auth.role() = 'authenticated');
create policy "keyword_history_write_admin_head" on keyword_history for all using (
  current_role_name() in ('admin', 'head')
) with check (current_role_name() in ('admin', 'head'));

-- audit_reports: all authenticated can read; admin/head can write
create policy "audit_select_all" on audit_reports for select using (auth.role() = 'authenticated');
create policy "audit_write_admin_head" on audit_reports for all using (
  current_role_name() in ('admin', 'head')
) with check (current_role_name() in ('admin', 'head'));

-- weekly_reports: all authenticated can read (v1: no writer path yet)
create policy "weekly_reports_select_all" on weekly_reports for select using (auth.role() = 'authenticated');
