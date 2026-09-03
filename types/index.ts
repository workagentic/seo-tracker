// Renamed 3 Sep 2026 (CLAUDE.md Section 14) from 'admin'/'head'/'owner'/'leadership' to match
// the business's own vocabulary. 'head' is retired (was vacant). The old 'owner' role split
// into 'senior' (near-admin: full read/write on /admin/* except Users, can create tasks, gets
// every sync button) and 'expert' (today's 'owner' behavior, unchanged). 'leadership' became
// 'reviewer' (Adeela only) -- now restricted to only the Tasks page, but with the same
// in-Tasks permissions 'expert' has.
export type Role = 'admin' | 'senior' | 'expert' | 'reviewer'

export interface Profile {
  id: string
  full_name: string
  role: Role
  job_title: string | null
  section_owner: string | null
  avatar_url: string | null
  created_at: string
  is_active: boolean
}

// 4 values (CLAUDE.md Section 14 Phase 2) -- 'overdue' is no longer stored, it's a computed
// visual flag (Phase 3); 'blocked' is now 'on_hold'; the approval-workflow statuses
// ('submitted_for_review'/'changes_requested') are gone along with the approver role itself.
export type TaskStatus = 'pending' | 'in_progress' | 'on_hold' | 'completed'
// Bare calendar-quarter label, no year -- see lib/constants.ts's getCurrentQuarter() /
// CLAUDE.md Section 14 Phase 1. Recurs every year, unlike quarterly_targets.quarter_key which
// is year-qualified (e.g. 'Q3-2026') to disambiguate targets across years.
export type QuarterLabel = 'Q1' | 'Q2' | 'Q3' | 'Q4'

export interface Task {
  id: string
  // Nullable since 3 Sep 2026 -- removed from the New Task form (the sprint-sheet-style codes
  // don't apply to manually-created tasks); still admin/senior-editable and shown when present.
  action_number: string | null
  title: string
  description: string | null
  position_responsible: string | null
  // The person permanently accountable for this task's outcome -- restricted at the app layer
  // to exactly 3 people (lib/tasks/constants.ts), and the only one who can mark it Completed.
  // Renamed from the old "Assigned to" field 2 Sep 2026 (CLAUDE.md Section 14 Phase 2).
  owner_id: string | null
  // Whoever's doing the hands-on work right now -- open to any profile, changes hands as the
  // task is routed between people. Replaces Co-Owner.
  assigned_to_id: string | null
  due_date: string | null
  // Set whenever the task is handed to a new assigned_to_id; must never be later than
  // due_date (enforced client-side, API-side, and by a DB CHECK constraint).
  deadline: string | null
  status: TaskStatus
  quarter: QuarterLabel | 'All' | null
  category_id: string | null
  notes: string | null
  link_url: string | null
  repeats: string | null
  next_due: string | null
  linked_finding_id: string | null
  linked_keyword_id: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
  updated_by: string | null
  owner_profile?: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null
  assigned_to_profile?: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null
  category?: Pick<TaskCategory, 'id' | 'name'> | null
  linked_finding?: Pick<AuditReport, 'id' | 'title' | 'status'> | null
  linked_keyword?: Pick<TrackedKeyword, 'id' | 'keyword'> | null
}

export interface TaskCategory {
  id: string
  name: string
  created_at: string
}

export interface TaskActivity {
  id: string
  task_id: string
  changed_by: string | null
  field: string
  old_value: string | null
  new_value: string | null
  created_at: string
  changed_by_profile?: Pick<Profile, 'id' | 'full_name'> | null
}

export interface TaskCommentImage {
  id: string
  comment_id: string
  image_url: string
  created_at: string
}

export interface TaskComment {
  id: string
  task_id: string
  author_id: string | null
  body: string
  created_at: string
  edited_at: string | null
  deleted_at: string | null
  author_profile?: Pick<Profile, 'id' | 'full_name'> | null
  // Pasted screenshots attached at post time (CLAUDE.md Section 14 follow-up, 3 Sep 2026) --
  // fixed once posted, not editable; delete and repost to change them.
  images?: TaskCommentImage[]
}

export type MetricKey =
  | 'domain_rating'
  | 'organic_traffic_global'
  | 'organic_traffic_us'
  | 'organic_keywords_global'
  | 'organic_keywords_us'
  | 'keywords_top_3'
  | 'keywords_top_10'
  | 'traffic_value_monthly'
  | 'referring_domains_total'
  | 'referring_domains_quality'
  | 'avg_keywords_per_page'
  | 'indexed_content_pages'

export type MetricSnapshot = {
  id: string
  snapshot_date: string
  quarter_label: string | null
  notes: string | null
  created_by: string | null
  created_at: string
} & Record<MetricKey, number | null>

export interface Competitor {
  id: string
  company_name: string
  domain: string
  domain_rating: number | null
  organic_traffic: number | null
  organic_keywords: number | null
  keywords_top_3: number | null
  est_traffic_value: number | null
  referring_domains: number | null
  last_synced_at: string | null
  is_active: boolean
  created_at: string
}

export interface WeeklyReportKpi {
  key: MetricKey
  label: string
  actual: number | null
  target: number
  ragStatus: RAGStatus
}

export interface WeeklyReportTask {
  id: string
  action_number: string | null
  title: string
  due_date: string | null
  owner: string | null
}

export interface WeeklyReportMetricMove {
  key: MetricKey
  label: string
  previous: number | null
  current: number | null
  deltaPct: number | null
}

export interface WeeklyReportKeywordMover {
  keyword: string
  previous_position: number | null
  current_position: number | null
  change: number
}

export interface WeeklyReportSummary {
  kpis: WeeklyReportKpi[]
  tasksDueSoon: WeeklyReportTask[]
  tasksOverdue: WeeklyReportTask[]
  metricsMoved: WeeklyReportMetricMove[]
  keywordMovers: WeeklyReportKeywordMover[]
}

export interface WeeklyReport {
  id: string
  week_start: string
  week_end: string
  generated_at: string
  summary: WeeklyReportSummary | null
  recipient_ids: string[] | null
}

export interface Ga4Snapshot {
  id: string
  snapshot_date: string
  sessions_global: number | null
  users_global: number | null
  new_users_global: number | null
  bounce_rate_global: number | null
  avg_session_duration_global: number | null
  sessions_us: number | null
  users_us: number | null
  new_users_us: number | null
  bounce_rate_us: number | null
  avg_session_duration_us: number | null
  created_by: string | null
  created_at: string
}

export interface ClarityTopPageEntry {
  url: string
  visits: number
}

export interface ClaritySnapshot {
  id: string
  snapshot_date: string
  total_sessions: number | null
  bot_sessions: number | null
  distinct_users: number | null
  dead_click_count: number | null
  rage_click_count: number | null
  script_error_count: number | null
  avg_scroll_depth: number | null
  top_pages: ClarityTopPageEntry[] | null
  created_by: string | null
  created_at: string
}

export interface CompetitorSnapshot {
  id: string
  competitor_id: string
  snapshot_date: string
  domain_rating: number | null
  organic_traffic: number | null
  organic_keywords: number | null
  keywords_top_3: number | null
  est_traffic_value: number | null
  referring_domains: number | null
  created_at: string
}

export type KeywordCategory = 'striking-distance' | 'commercial' | 'glossary' | 'niche'
export type KeywordPriority = 'high' | 'medium' | 'low'

export interface TrackedKeyword {
  id: string
  keyword: string
  priority: KeywordPriority | null
  category: KeywordCategory | null
  target_url: string | null
  monthly_volume: number | null
  keyword_difficulty: number | null
  cpc: number | null
  current_position: number | null
  previous_position: number | null
  position_updated_at: string | null
  notes: string | null
  is_active: boolean
  created_at: string
}

export interface KeywordHistoryEntry {
  id: string
  keyword_id: string
  recorded_at: string
  position: number | null
  url: string | null
}

export type AuditCategory = 'technical' | 'backlink' | 'content' | 'on-page' | 'architecture'
export type AuditSeverity = 'critical' | 'high' | 'medium' | 'low'
export type AuditStatus = 'open' | 'in_progress' | 'resolved' | 'wont_fix'

export interface AuditReport {
  id: string
  title: string
  category: AuditCategory | null
  severity: AuditSeverity | null
  finding: string
  recommendation: string | null
  assigned_to: string | null
  status: AuditStatus
  resolved_at: string | null
  created_at: string
  assigned_profile?: Pick<Profile, 'id' | 'full_name'> | null
}

export type RAGStatus = 'green' | 'amber' | 'red' | 'no-data'

export interface AppSettings {
  id: true
  target_domain: string
  gsc_site_url: string | null
  ga4_property_id: string | null
  updated_by: string | null
  updated_at: string
}

export interface SyncLog {
  id: string
  source: string
  status: 'success' | 'error'
  message: string | null
  triggered_by: string | null
  created_at: string
}

export interface QuarterTarget {
  label: string
  date: string
  domain_rating: number
  organic_traffic_global: number
  organic_traffic_us: number
  organic_keywords_global: number
  organic_keywords_us: number
  keywords_top_3: number
  keywords_top_10: number
  traffic_value_monthly: number
  referring_domains_total: number
  referring_domains_quality: number
  avg_keywords_per_page: number
  indexed_content_pages: number
}

// Admin-editable Scorecard "Accountable Owner" mapping -- replaced the hardcoded
// ACCOUNTABILITY_MAP constant 2 Sep 2026 (CLAUDE.md Section 14 Phase 5, migration
// 0027_metric_accountability.sql). owner_names are plain display strings (e.g. "Talha
// Azeem", or the catch-all "All owners"), not profile references.
export interface MetricAccountability {
  metric_key: string
  owner_names: string[]
  updated_by: string | null
  updated_at: string
}

export type LeadStage =
  | 'new_lead'
  | 'introductory_call'
  | 'followup_1'
  | 'followup_2'
  | 'followup_3'
  | 'won'
  | 'lost'
export type LeadBrand = 'workagentic' | 'expertise_accelerated'

export interface LeadSource {
  id: string
  name: string
  requires_submission_from: boolean
  is_active: boolean
  created_at: string
}

// Per-source, admin-editable options for the "Submission From" field -- replaced the
// hardcoded 3-value LeadSubmissionFrom enum 2 Sep 2026 (CLAUDE.md Section 14 Phase 4,
// migration 0026_lead_source_submission_options.sql).
export interface LeadSourceSubmissionOption {
  id: string
  source_id: string
  label: string
  is_active: boolean
  created_at: string
}

export type LeadSourceWithOptions = LeadSource & { submission_options: LeadSourceSubmissionOption[] }

export interface Lead {
  id: string
  stage: LeadStage
  lead_date: string
  full_name: string
  company_name: string | null
  email: string | null
  phone_number: string | null
  revenue: number | null
  service_needed: string | null
  brand: LeadBrand | null
  employee_size: string | null
  source_id: string | null
  point_of_contact: string | null
  submission_from_id: string | null
  intro_call_date: string | null
  intro_call_status: 'conducted' | 'pending' | null
  intro_call_meeting_minutes: string | null
  intro_call_email_sent: string | null
  followup_1_scheduled_date: string | null
  followup_1_date: string | null
  followup_1_notes: string | null
  followup_1_email_sent: string | null
  followup_2_scheduled_date: string | null
  followup_2_date: string | null
  followup_2_notes: string | null
  followup_2_email_sent: string | null
  followup_3_scheduled_date: string | null
  followup_3_date: string | null
  followup_3_notes: string | null
  followup_3_email_sent: string | null
  won_date: string | null
  won_notes: string | null
  conversion_value: number | null
  lost_date: string | null
  lost_notes: string | null
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
  source?: Pick<LeadSource, 'id' | 'name' | 'requires_submission_from'> | null
}
