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

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'blocked' | 'overdue'
export type QuarterLabel = 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'Q5'

export interface Task {
  id: string
  action_number: string
  title: string
  description: string | null
  position_responsible: string | null
  assigned_to: string | null
  co_assigned_to: string | null
  due_date: string | null
  status: TaskStatus
  quarter: QuarterLabel | 'All' | null
  notes: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
  updated_by: string | null
  assigned_profile?: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null
  co_assigned_profile?: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null
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
