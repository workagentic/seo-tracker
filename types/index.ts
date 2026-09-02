export type Role = 'admin' | 'head' | 'owner' | 'leadership'

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

export type TaskStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'blocked'
  | 'overdue'
  | 'submitted_for_review'
  | 'changes_requested'
export type QuarterLabel = 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'Q5'

export interface Task {
  id: string
  action_number: string
  title: string
  description: string | null
  position_responsible: string | null
  assigned_to: string | null
  co_assigned_to: string | null
  approver_id: string | null
  due_date: string | null
  status: TaskStatus
  quarter: QuarterLabel | 'All' | null
  category: string | null
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
  assigned_profile?: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null
  co_assigned_profile?: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null
  approver_profile?: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null
  linked_finding?: Pick<AuditReport, 'id' | 'title' | 'status'> | null
  linked_keyword?: Pick<TrackedKeyword, 'id' | 'keyword'> | null
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

export interface TaskComment {
  id: string
  task_id: string
  author_id: string | null
  body: string
  created_at: string
  author_profile?: Pick<Profile, 'id' | 'full_name'> | null
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
  action_number: string
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
