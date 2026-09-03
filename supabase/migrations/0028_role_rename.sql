-- Role vocabulary rebuild (confirmed with Abdullah 3 Sep 2026): profiles.role moves from
-- 'admin'/'head'/'owner'/'leadership' to 'admin'/'senior'/'expert'/'reviewer' -- the DB now
-- uses the same names the business actually calls these tiers, instead of permanently
-- disagreeing with them. 'head' is retired entirely (it was vacant -- nobody held it).
--
-- Mapping: admin stays admin (Haroon, Abdullah Shekha, Syed Ali, unchanged). The old 'owner'
-- role splits in two: Najma Furqan + Tabish Khalid become 'senior' (near-admin: full
-- read/write on every /admin/* sub-page except Users, can create tasks, gets every sync
-- button); Hameed Ishaq, Usman Ali, Lavi Shamoon, Talha Azeem become 'expert' (keeps exactly
-- today's 'owner' behavior/access, unchanged in substance). 'leadership' (Adeela only)
-- becomes 'reviewer' -- newly restricted to ONLY the Tasks page (loses the broad team-wide
-- read access 'leadership' had everywhere else), but within Tasks gets the same permissions
-- 'expert' has (comment, self-manage tasks she's Owner/Assigned-To on).

-- 1. Reassign people BEFORE swapping the CHECK constraint (old values still valid here).
update profiles set role = 'senior' where full_name in ('Najma Furqan', 'Tabish Khalid');
update profiles set role = 'expert' where full_name in ('Hameed Ishaq', 'Usman Ali', 'Lavi Shamoon', 'Talha Azeem');
update profiles set role = 'reviewer' where full_name = 'Adeela';
-- admin holders (Haroon, Abdullah Shekha, Syed Ali) are untouched.

-- 2. Swap the CHECK constraint (auto-named profiles_role_check, from the inline `check` in
--    migration 0001_initial_schema.sql's CREATE TABLE).
alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check
  check (role in ('admin', 'senior', 'expert', 'reviewer'));

-- 3. RLS: every policy that referenced 'head' as an admin-equivalent tier moves to 'senior'
--    (mechanical swap -- 'senior' inherits exactly what 'head' was already granted). Policies
--    renamed to match (dropped and recreated under a new name) rather than left calling
--    themselves "admin_head" forever.

drop policy if exists "tasks_update_admin_head" on tasks;
create policy "tasks_update_admin_senior" on tasks for update using (
  current_role_name() in ('admin', 'senior')
);
drop policy if exists "tasks_insert_admin_head" on tasks;
create policy "tasks_insert_admin_senior" on tasks for insert with check (
  current_role_name() in ('admin', 'senior')
);

drop policy if exists "snapshots_insert_admin_head" on metric_snapshots;
create policy "snapshots_insert_admin_senior" on metric_snapshots for insert with check (
  current_role_name() in ('admin', 'senior')
);

drop policy if exists "keywords_write_admin_head" on tracked_keywords;
create policy "keywords_write_admin_senior" on tracked_keywords for all using (
  current_role_name() in ('admin', 'senior')
) with check (current_role_name() in ('admin', 'senior'));

drop policy if exists "keyword_history_write_admin_head" on keyword_history;
create policy "keyword_history_write_admin_senior" on keyword_history for all using (
  current_role_name() in ('admin', 'senior')
) with check (current_role_name() in ('admin', 'senior'));

drop policy if exists "audit_write_admin_head" on audit_reports;
create policy "audit_write_admin_senior" on audit_reports for all using (
  current_role_name() in ('admin', 'senior')
) with check (current_role_name() in ('admin', 'senior'));

drop policy if exists "sync_logs_select_admin_head" on sync_logs;
create policy "sync_logs_select_admin_senior" on sync_logs for select using (
  current_role_name() in ('admin', 'senior')
);
drop policy if exists "sync_logs_insert_admin_head" on sync_logs;
create policy "sync_logs_insert_admin_senior" on sync_logs for insert with check (
  current_role_name() in ('admin', 'senior')
);

drop policy if exists "competitor_snapshots_write_admin_head" on competitor_snapshots;
create policy "competitor_snapshots_write_admin_senior" on competitor_snapshots for all using (
  current_role_name() in ('admin', 'senior')
) with check (current_role_name() in ('admin', 'senior'));

drop policy if exists "ga4_snapshots_write_admin_head" on ga4_snapshots;
create policy "ga4_snapshots_write_admin_senior" on ga4_snapshots for all using (
  current_role_name() in ('admin', 'senior')
) with check (current_role_name() in ('admin', 'senior'));

drop policy if exists "clarity_snapshots_write_admin_head" on clarity_snapshots;
create policy "clarity_snapshots_write_admin_senior" on clarity_snapshots for all using (
  current_role_name() in ('admin', 'senior')
) with check (current_role_name() in ('admin', 'senior'));

drop policy if exists "weekly_reports_write_admin_head" on weekly_reports;
create policy "weekly_reports_write_admin_senior" on weekly_reports for all using (
  current_role_name() in ('admin', 'senior')
) with check (current_role_name() in ('admin', 'senior'));

-- app_settings read access: was admin/head/leadership (a full-team-read exception per old
-- CLAUDE.md Section 4). Since 'reviewer' now only ever sees the Tasks page (no Settings UI
-- reaches this table for them), narrowed to admin/senior -- the two tiers that actually have
-- a Settings page to read it from.
drop policy if exists "settings_select_admin_head_leadership" on app_settings;
create policy "settings_select_admin_senior" on app_settings for select using (
  current_role_name() in ('admin', 'senior')
);

-- 4. tasks_update_owner: the self-service row-level policy (non-admin editing a task they're
--    Owner/Assigned-To on). 'owner' role split into 'senior'/'expert', both keep this.
drop policy if exists "tasks_update_owner" on tasks;
create policy "tasks_update_owner" on tasks for update using (
  current_role_name() in ('senior', 'expert') and (owner_id = auth.uid() or assigned_to_id = auth.uid())
);

-- 5. tasks_update_assigned_leadership -> tasks_update_assigned_reviewer: same shape (the
--    Assigned-To-only carve-out a role that's otherwise not Owner-eligible needs), renamed
--    for the new role. Reviewer is never Owner-eligible (ELIGIBLE_OWNER_NAMES is unchanged --
--    Tabish Khalid/Syed Ali/Najma Furqan by name), so this only ever matches via
--    assigned_to_id, same as the policy it replaces.
drop policy if exists "tasks_update_assigned_leadership" on tasks;
create policy "tasks_update_assigned_reviewer" on tasks for update using (
  current_role_name() = 'reviewer' and assigned_to_id = auth.uid()
);
