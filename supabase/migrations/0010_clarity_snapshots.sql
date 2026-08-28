-- Microsoft Clarity integration (CLAUDE.md Section 7.4, previously v2/unbuilt). One row per
-- pull, same "patch today's row" pattern as ga4_snapshots/metric_snapshots.
create table clarity_snapshots (
  id uuid primary key default gen_random_uuid(),
  snapshot_date date not null,
  total_sessions integer,
  bot_sessions integer,
  distinct_users integer,
  dead_click_count integer,
  rage_click_count integer,
  script_error_count integer,
  avg_scroll_depth numeric,
  top_pages jsonb,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

alter table clarity_snapshots enable row level security;

create policy "clarity_snapshots_select_all" on clarity_snapshots for select using (
  auth.role() = 'authenticated'
);
create policy "clarity_snapshots_write_admin_head" on clarity_snapshots for all using (
  current_role_name() in ('admin', 'head')
) with check (current_role_name() in ('admin', 'head'));

grant select on clarity_snapshots to authenticated;
grant all privileges on clarity_snapshots to service_role;
