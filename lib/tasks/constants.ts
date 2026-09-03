// The only 3 people who can be a task's Owner (CLAUDE.md Section 14 Phase 2) -- a task-level
// business rule, not a profiles.role restriction (unaffected by the 3 Sep 2026 role rename).
// Syed Ali is role='admin', Tabish Khalid and Najma Furqan are role='senior'.
export const ELIGIBLE_OWNER_NAMES = ['Tabish Khalid', 'Syed Ali', 'Najma Furqan'] as const
