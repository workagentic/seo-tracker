-- Phase 1 of the Task Tracker/Quarter overhaul (CLAUDE.md Section 14, confirmed with
-- Abdullah 2 Sep 2026): switch from "programme quarters" (counted up from kickoff, a fixed
-- 5-entry Q1-Q5 list that would need manual extension forever) to standard, repeating
-- calendar quarters -- Q1=Jan-Mar, Q2=Apr-Jun, Q3=Jul-Sep, Q4=Oct-Dec, computed generically
-- for any year.
--
-- This is a pure relabel, not a value change: every old quarter-end date already lines up
-- with a real calendar-quarter end (old Q1 end 2026-09-30 = end of calendar Q3 2026, old Q2
-- end 2026-12-31 = end of calendar Q4 2026, etc.), so no target numbers move.

-- 1. quarterly_targets: add a year column -- quarter_key alone can no longer disambiguate,
--    since "Q3" (etc.) now legitimately recurs every year with different targets -- and
--    relabel the 5 non-baseline rows. New key format embeds the year (e.g. 'Q3-2026') so the
--    text primary key stays unique without a schema-breaking key-type change.
alter table quarterly_targets add column year integer;

update quarterly_targets set quarter_key = 'Q3-2026', label = 'Q3 2026', year = 2026 where quarter_key = 'Q1';
update quarterly_targets set quarter_key = 'Q4-2026', label = 'Q4 2026', year = 2026 where quarter_key = 'Q2';
update quarterly_targets set quarter_key = 'Q1-2027', label = 'Q1 2027', year = 2027 where quarter_key = 'Q3';
update quarterly_targets set quarter_key = 'Q2-2027', label = 'Q2 2027', year = 2027 where quarter_key = 'Q4';
update quarterly_targets set quarter_key = 'Q3-2027', label = 'Q3 2027', year = 2027 where quarter_key = 'Q5';
-- 'baseline' row is untouched -- it isn't a calendar quarter and needs no year.

-- 2. tasks.quarter: the 92-task September production sprint was seeded under the old label
--    'Q1' (CLAUDE.md Section 10.2) -- becomes 'Q3', since the whole sprint sits inside
--    calendar Q3 2026. tasks.quarter has no year component (it's a small enum-ish label the
--    Task Tracker's filter dropdown offers, not a unique key), matching how Phase 2 will
--    keep reusing bare 'Q1'-'Q4' for future years.
update tasks set quarter = 'Q3' where quarter = 'Q1';

-- 3. metric_snapshots.quarter_label: defensive relabel in case a live Ahrefs/GSC sync already
--    wrote a snapshot under the old 'Q1' label before this migration ran (the sync routes call
--    the same getCurrentQuarter() this migration is fixing). Unlike tasks.quarter, this needs
--    the year-qualified form to keep matching quarterly_targets.quarter_key -- the Scorecard
--    page matches a snapshot to a quarter by this exact string (app/(dashboard)/scorecard/page.tsx).
--    No-op if no 'Q1'-labeled snapshot exists yet.
update metric_snapshots set quarter_label = 'Q3-2026' where quarter_label = 'Q1';
