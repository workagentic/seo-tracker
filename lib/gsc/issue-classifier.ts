import type { AuditSeverity } from '@/types'

export interface IssueClassification {
  hasIssue: boolean
  severity: AuditSeverity | null
  summary: string
}

const OK_STATES = new Set([
  'Submitted and indexed',
  'Indexed, not submitted in sitemap',
  'Alternate page with proper canonical tag',
])

const CRITICAL_STATES = new Set([
  'Not found (404)',
  'Server error (5xx)',
  'Blocked due to unauthorized request (401)',
])

const HIGH_STATES = new Set([
  'Blocked by robots.txt',
  "Excluded by 'noindex' tag",
  'Duplicate, Google chose different canonical than user',
])

const MEDIUM_STATES = new Set([
  'Crawled - currently not indexed',
  'Discovered - currently not indexed',
  'Duplicate without user-selected canonical',
  'Page with redirect',
])

// Best-effort mapping -- Google doesn't publish `coverageState` as a fixed enum, so this is
// deliberately a simple lookup, easy to extend without a migration if a real coverage state
// doesn't match one of these strings exactly.
export function classifyCoverageState(coverageState: string, verdict: string): IssueClassification {
  if (OK_STATES.has(coverageState)) {
    return { hasIssue: false, severity: null, summary: coverageState }
  }
  if (CRITICAL_STATES.has(coverageState)) {
    return { hasIssue: true, severity: 'critical', summary: coverageState }
  }
  if (HIGH_STATES.has(coverageState)) {
    return { hasIssue: true, severity: 'high', summary: coverageState }
  }
  if (MEDIUM_STATES.has(coverageState)) {
    return { hasIssue: true, severity: 'medium', summary: coverageState }
  }
  // Catch-all: an unrecognized state is only flagged if GSC's own verdict says it's not fine.
  if (verdict !== 'PASS') {
    return { hasIssue: true, severity: 'low', summary: coverageState }
  }
  return { hasIssue: false, severity: null, summary: coverageState }
}

export function classifySitemapIssue(errors: number, warnings: number): IssueClassification {
  if (errors > 0) {
    return { hasIssue: true, severity: 'high', summary: `${errors} error(s), ${warnings} warning(s)` }
  }
  if (warnings > 0) {
    return { hasIssue: true, severity: 'medium', summary: `${warnings} warning(s)` }
  }
  return { hasIssue: false, severity: null, summary: 'No errors or warnings' }
}
