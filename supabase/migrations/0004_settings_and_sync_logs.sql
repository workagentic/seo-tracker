-- CLAUDE.md Section 8.9: /admin/sync (sync logs) and /admin/settings (target domain,
-- GSC site URL, GA4 property ID). Quarter start/end dates deliberately stay in
-- lib/constants.ts (Section 9.3 — "so Haroon can extend the programme" via code, not
-- a runtime setting), so they are not stored here.

create table app_settings (
  id boolean primary key default true check (id),
  target_domain text not null default 'expertiseaccelerated.com',
  gsc_site_url text,
  ga4_property_id text,
  updated_by uuid references profiles(id),
  updated_at timestamptz default now()
);
insert into app_settings (id) values (true);

create table sync_logs (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'ahrefs',
  status text not null check (status in ('success', 'error')),
  message text,
  triggered_by uuid references profiles(id),
  created_at timestamptz default now()
);

alter table app_settings enable row level security;
alter table sync_logs enable row level security;

-- settings: admin/head/leadership can read (full read access per CLAUDE.md Section 4); admin writes
create policy "settings_select_admin_head_leadership" on app_settings for select using (
  current_role_name() in ('admin', 'head', 'leadership')
);
create policy "settings_write_admin" on app_settings for update using (
  current_role_name() = 'admin'
) with check (current_role_name() = 'admin');

-- sync_logs: admin/head can read (matches who can trigger a sync); service role writes them
create policy "sync_logs_select_admin_head" on sync_logs for select using (
  current_role_name() in ('admin', 'head')
);
create policy "sync_logs_insert_admin_head" on sync_logs for insert with check (
  current_role_name() in ('admin', 'head')
);
