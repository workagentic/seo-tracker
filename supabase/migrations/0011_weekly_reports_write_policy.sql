-- weekly_reports had select-only RLS ("v1: no writer path yet" per 0002's comment). The
-- weekly report generator (lib/weekly-report.ts) writes via the service-role client
-- regardless, but this closes the RLS gap for defense-in-depth, same reasoning as
-- tasks_delete_admin (migration 0008).
create policy "weekly_reports_write_admin_head" on weekly_reports for all using (
  current_role_name() in ('admin', 'head')
) with check (current_role_name() in ('admin', 'head'));
