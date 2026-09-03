-- Removes "Action number" from the New Task form (confirmed with Abdullah 3 Sep 2026) -- the
-- sprint-sheet-style codes (S1, L1, A16-W5, etc.) don't make sense once staff are creating
-- tasks manually rather than importing them from a sprint sheet. The column stays (still
-- editable by admin on existing tasks, still shown as a tag when present) but is no longer
-- required at creation.
alter table tasks alter column action_number drop not null;
