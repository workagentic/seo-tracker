-- No delete policy existed for tasks (0002_rls_policies.sql only covers select/update/insert).
-- The service-role client used by app/api/tasks/[id]/route.ts's DELETE bypasses RLS
-- regardless, but this closes the gap for defense-in-depth and any future non-service-role
-- caller. Admin only, per Abdullah's request that task add/edit/delete be admin-only.
create policy "tasks_delete_admin" on tasks for delete using (
  current_role_name() = 'admin'
);
