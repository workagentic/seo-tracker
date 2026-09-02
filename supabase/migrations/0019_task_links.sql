-- Link a task to the Audit finding or keyword it addresses (Staff Docs/further_recs_mockup.html
-- #5) -- this is what would have caught the real A12-vs-finding mismatch (task marked
-- completed, its finding still open) at the source. `linked_finding_id` also drives the
-- "resolve this finding too?" prompt when a linked task is approved/completed
-- (app/api/tasks/[id]/route.ts).
alter table tasks add column linked_finding_id uuid references audit_reports(id);
alter table tasks add column linked_keyword_id uuid references tracked_keywords(id);
