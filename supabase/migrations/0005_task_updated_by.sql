-- Tracks who last changed a task's status/notes, so notifications (lib/notifications.ts)
-- can distinguish "changed by someone else" from the current user's own edit. Not a full
-- activity log (CLAUDE.md Section 14 still lists that as a known gap) — just enough to
-- support the notification bell without a new table.
alter table tasks add column updated_by uuid references profiles(id);
