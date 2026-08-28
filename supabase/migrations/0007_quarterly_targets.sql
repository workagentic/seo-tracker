-- Moves QUARTERLY_TARGETS from a hardcoded lib/constants.ts object into an admin-editable
-- table, per Abdullah's request (28 Aug 2026): admins should be able to correct/adjust
-- quarterly target numbers without a code deploy. Seeded from the exact values that were
-- previously hardcoded, so nothing changes functionally until an admin edits a row.
create table quarterly_targets (
  quarter_key text primary key,  -- 'baseline' | 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'Q5'
  label text not null,
  target_date date not null,
  domain_rating integer,
  organic_traffic_global integer,
  organic_traffic_us integer,
  organic_keywords_global integer,
  organic_keywords_us integer,
  keywords_top_3 integer,
  keywords_top_10 integer,
  traffic_value_monthly numeric,
  referring_domains_total integer,
  referring_domains_quality integer,
  avg_keywords_per_page numeric,
  indexed_content_pages integer,
  updated_by uuid references profiles(id),
  updated_at timestamptz default now()
);

insert into quarterly_targets (
  quarter_key, label, target_date, domain_rating, organic_traffic_global, organic_traffic_us,
  organic_keywords_global, organic_keywords_us, keywords_top_3, keywords_top_10,
  traffic_value_monthly, referring_domains_total, referring_domains_quality,
  avg_keywords_per_page, indexed_content_pages
) values
  ('baseline', 'Baseline', '2026-08-23', 24, 286, 260, 115, 86, 16, 96, 1467, 861, 35, 2.5, 45),
  ('Q1', 'Q1', '2026-09-30', 25, 520, 480, 240, 190, 34, 189, 2900, 900, 75, 4, 60),
  ('Q2', 'Q2', '2026-12-31', 32, 1600, 1470, 700, 550, 105, 505, 8500, 1030, 160, 8, 100),
  ('Q3', 'Q3', '2027-03-31', 39, 2900, 2670, 1250, 985, 205, 875, 16000, 1180, 260, 13, 155),
  ('Q4', 'Q4', '2027-06-30', 45, 4800, 4450, 1950, 1540, 370, 1390, 28000, 1350, 370, 18, 210),
  ('Q5', 'Q5', '2027-09-30', 50, 7500, 6990, 2800, 2205, 570, 2000, 46000, 1540, 490, 23, 260);

alter table quarterly_targets enable row level security;

create policy "quarterly_targets_select_all" on quarterly_targets for select using (
  auth.role() = 'authenticated'
);
create policy "quarterly_targets_write_admin" on quarterly_targets for update using (
  current_role_name() = 'admin'
) with check (current_role_name() = 'admin');

grant select on quarterly_targets to authenticated;
grant all privileges on quarterly_targets to service_role;
