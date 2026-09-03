-- Clears the September-sprint task register (confirmed with Abdullah 3 Sep 2026, no backup
-- requested) so Senior/Admin staff can create the real task list manually from here on out.
-- Safe as a plain DELETE: task_activity and task_comments both cascade on task_id (migrations
-- 0012/0016), and tasks.linked_finding_id/linked_keyword_id are outgoing references from
-- tasks to audit_reports/tracked_keywords, not incoming ones, so neither of those tables is
-- affected.
delete from tasks;
