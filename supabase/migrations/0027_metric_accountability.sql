-- Phase 5 of the Task Tracker/Quarter overhaul (CLAUDE.md Section 14): moves the Scorecard's
-- "Accountable Owner" column from a hardcoded lib/constants.ts constant (ACCOUNTABILITY_MAP)
-- into an admin-editable table, seeded from the exact same values so nothing changes
-- functionally until an admin edits a row -- same pattern as quarterly_targets (0007).
create table metric_accountability (
  metric_key text primary key,
  owner_names text[] not null default '{}',
  updated_by uuid references profiles(id),
  updated_at timestamptz default now()
);

alter table metric_accountability enable row level security;

create policy "metric_accountability_select_all" on metric_accountability for select using (
  auth.role() = 'authenticated'
);
create policy "metric_accountability_write_admin" on metric_accountability for update using (
  current_role_name() = 'admin'
) with check (current_role_name() = 'admin');

grant select on metric_accountability to authenticated;
grant all privileges on metric_accountability to service_role;

insert into metric_accountability (metric_key, owner_names) values
  ('domain_rating', array['Talha Azeem', 'Syed Ali']),
  ('referring_domains_quality', array['Syed Ali']),
  ('referring_domains_total', array['Syed Ali']),
  ('keywords_top_3', array['Lavi Shamoon', 'Najma Furqan']),
  ('organic_keywords_global', array['Lavi Shamoon', 'Najma Furqan']),
  ('avg_keywords_per_page', array['Talha Azeem', 'Najma Furqan']),
  ('indexed_content_pages', array['Lavi Shamoon']),
  ('traffic_value_monthly', array['Najma Furqan', 'Tabish Khalid']),
  ('organic_traffic_us', array['Najma Furqan', 'Tabish Khalid']),
  ('organic_traffic_global', array['All owners']);
