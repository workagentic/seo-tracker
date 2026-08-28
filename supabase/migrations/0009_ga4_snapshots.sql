-- GA4 integration (CLAUDE.md Section 7.3, previously v2/unbuilt). One row per pull, same
-- "patch today's row" pattern as metric_snapshots (0001) and keyword_history (0005 GSC fix)
-- rather than allowing same-day duplicates.
create table ga4_snapshots (
  id uuid primary key default gen_random_uuid(),
  snapshot_date date not null,
  sessions_global integer,
  users_global integer,
  new_users_global integer,
  bounce_rate_global numeric,
  avg_session_duration_global numeric,
  sessions_us integer,
  users_us integer,
  new_users_us integer,
  bounce_rate_us numeric,
  avg_session_duration_us numeric,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

alter table ga4_snapshots enable row level security;

create policy "ga4_snapshots_select_all" on ga4_snapshots for select using (
  auth.role() = 'authenticated'
);
create policy "ga4_snapshots_write_admin_head" on ga4_snapshots for all using (
  current_role_name() in ('admin', 'head')
) with check (current_role_name() in ('admin', 'head'));

grant select on ga4_snapshots to authenticated;
grant all privileges on ga4_snapshots to service_role;
