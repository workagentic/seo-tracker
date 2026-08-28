-- Weekly point-in-time history for competitors, mirroring keyword_history's role for
-- tracked_keywords. The `competitors` table itself only holds current-state values, so
-- there was no way to see week-over-week trend before this.
create table competitor_snapshots (
  id uuid primary key default gen_random_uuid(),
  competitor_id uuid references competitors(id) on delete cascade,
  snapshot_date date not null,
  domain_rating integer,
  organic_traffic integer,
  organic_keywords integer,
  keywords_top_3 integer,
  est_traffic_value numeric,
  referring_domains integer,
  created_at timestamptz default now()
);

alter table competitor_snapshots enable row level security;

create policy "competitor_snapshots_select_all" on competitor_snapshots for select using (
  auth.role() = 'authenticated'
);
create policy "competitor_snapshots_write_admin_head" on competitor_snapshots for all using (
  current_role_name() in ('admin', 'head')
) with check (current_role_name() in ('admin', 'head'));

-- Explicit grants rather than relying solely on migration 0003's "alter default privileges"
-- (that mechanism only covers tables created by the same role that ran it, and migration
-- 0004 already turned out to be silently un-applied in production once — see CLAUDE.md
-- Section 14 / the GSC integration's setup notes. Belt and suspenders here.)
grant select on competitor_snapshots to authenticated;
grant all privileges on competitor_snapshots to service_role;
