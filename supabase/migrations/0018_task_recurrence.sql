-- Explicit recurrence (Staff Docs/further_recs_mockup.html #3). A task whose cadence only
-- exists as words in the Title (e.g. the old A34 "Re-run full report each quarter") can never
-- be flagged overdue -- there's no date to compare against. `repeats` is a freeform cadence
-- label (e.g. "Weekly, on Friday"); `next_due` is the actual comparable date, and stands in
-- for `due_date` wherever overdue-ness is computed once it's set (see lib/tasks, task-list.tsx,
-- app/api/cron/daily-overdue).
alter table tasks add column repeats text;
alter table tasks add column next_due date;
