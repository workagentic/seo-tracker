// The only 3 people who can be a task's Owner (CLAUDE.md Section 14 Phase 2) -- a task-level
// business rule, not a profiles.role restriction. Role assignments stay as-is for everyone;
// Syed Ali is role='admin', Tabish Khalid and Najma Furqan are role='owner'.
export const ELIGIBLE_OWNER_NAMES = ['Tabish Khalid', 'Syed Ali', 'Najma Furqan'] as const
