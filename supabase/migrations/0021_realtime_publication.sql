-- Live sync (no manual refresh needed) across shared pages. Adds the tables backing
-- Tasks/Dashboard/Competitors/Keywords/Audit to the supabase_realtime publication so
-- components/layout/realtime-refresh.tsx can subscribe to postgres_changes on them from the
-- browser. Existing "_select_all" RLS policies (auth.role() = 'authenticated') already cover
-- these tables for realtime too -- postgres_changes respects the same SELECT policies.
alter publication supabase_realtime add table tasks;
alter publication supabase_realtime add table task_activity;
alter publication supabase_realtime add table task_comments;
alter publication supabase_realtime add table competitors;
alter publication supabase_realtime add table tracked_keywords;
alter publication supabase_realtime add table keyword_history;
alter publication supabase_realtime add table audit_reports;
alter publication supabase_realtime add table metric_snapshots;
alter publication supabase_realtime add table ga4_snapshots;
alter publication supabase_realtime add table clarity_snapshots;
