import type { QuarterTarget, Role } from '@/types'

export const QUARTERLY_TARGETS: Record<
  'baseline' | 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'Q5',
  QuarterTarget
> = {
  baseline: {
    label: 'Baseline', date: '2026-08-23', domain_rating: 24,
    organic_traffic_global: 286, organic_traffic_us: 260,
    organic_keywords_global: 115, organic_keywords_us: 86,
    keywords_top_3: 16, keywords_top_10: 96, traffic_value_monthly: 1467,
    referring_domains_total: 861, referring_domains_quality: 35,
    avg_keywords_per_page: 2.5, indexed_content_pages: 45,
  },
  Q1: {
    label: 'Q1', date: '2026-09-30', domain_rating: 25,
    organic_traffic_global: 520, organic_traffic_us: 480,
    organic_keywords_global: 240, organic_keywords_us: 190,
    keywords_top_3: 34, keywords_top_10: 189, traffic_value_monthly: 2900,
    referring_domains_total: 900, referring_domains_quality: 75,
    avg_keywords_per_page: 4, indexed_content_pages: 60,
  },
  Q2: {
    label: 'Q2', date: '2026-12-31', domain_rating: 32,
    organic_traffic_global: 1600, organic_traffic_us: 1470,
    organic_keywords_global: 700, organic_keywords_us: 550,
    keywords_top_3: 105, keywords_top_10: 505, traffic_value_monthly: 8500,
    referring_domains_total: 1030, referring_domains_quality: 160,
    avg_keywords_per_page: 8, indexed_content_pages: 100,
  },
  Q3: {
    label: 'Q3', date: '2027-03-31', domain_rating: 39,
    organic_traffic_global: 2900, organic_traffic_us: 2670,
    organic_keywords_global: 1250, organic_keywords_us: 985,
    keywords_top_3: 205, keywords_top_10: 875, traffic_value_monthly: 16000,
    referring_domains_total: 1180, referring_domains_quality: 260,
    avg_keywords_per_page: 13, indexed_content_pages: 155,
  },
  Q4: {
    label: 'Q4', date: '2027-06-30', domain_rating: 45,
    organic_traffic_global: 4800, organic_traffic_us: 4450,
    organic_keywords_global: 1950, organic_keywords_us: 1540,
    keywords_top_3: 370, keywords_top_10: 1390, traffic_value_monthly: 28000,
    referring_domains_total: 1350, referring_domains_quality: 370,
    avg_keywords_per_page: 18, indexed_content_pages: 210,
  },
  Q5: {
    label: 'Q5', date: '2027-09-30', domain_rating: 50,
    organic_traffic_global: 7500, organic_traffic_us: 6990,
    organic_keywords_global: 2800, organic_keywords_us: 2205,
    keywords_top_3: 570, keywords_top_10: 2000, traffic_value_monthly: 46000,
    referring_domains_total: 1540, referring_domains_quality: 490,
    avg_keywords_per_page: 23, indexed_content_pages: 260,
  },
}

export const ACCOUNTABILITY_MAP: Record<string, string[]> = {
  domain_rating: ['Talha Azeem', 'Syed Ali'],
  referring_domains_quality: ['Syed Ali'],
  referring_domains_total: ['Syed Ali'],
  keywords_top_3: ['Lavi Shamoon', 'Najma Furqan'],
  organic_keywords_global: ['Lavi Shamoon', 'Najma Furqan'],
  avg_keywords_per_page: ['Talha Azeem', 'Najma Furqan'],
  indexed_content_pages: ['Lavi Shamoon'],
  traffic_value_monthly: ['Najma Furqan', 'Tabish Khalid'],
  organic_traffic_us: ['Najma Furqan', 'Tabish Khalid'],
  organic_traffic_global: ['All owners'],
}

export const QUARTER_BOUNDARIES: { label: string; start: string; end: string }[] = [
  { label: 'Q1', start: '2026-08-24', end: '2026-09-30' },
  { label: 'Q2', start: '2026-10-01', end: '2026-12-31' },
  { label: 'Q3', start: '2027-01-01', end: '2027-03-31' },
  { label: 'Q4', start: '2027-04-01', end: '2027-06-30' },
  { label: 'Q5', start: '2027-07-01', end: '2027-09-30' },
]

export function getCurrentQuarter(date: Date): string {
  const iso = date.toISOString().slice(0, 10)
  for (const q of QUARTER_BOUNDARIES) {
    if (iso >= q.start && iso <= q.end) return q.label
  }
  if (iso < QUARTER_BOUNDARIES[0].start) return QUARTER_BOUNDARIES[0].label
  return QUARTER_BOUNDARIES[QUARTER_BOUNDARIES.length - 1].label
}

export const TEAM_MEMBERS: { full_name: string; role: Role; job_title: string }[] = [
  { full_name: 'Abdullah Shekha', role: 'admin', job_title: 'Analyst / Supervisor' },
  { full_name: 'Tabish Khalid', role: 'head', job_title: 'Head of SEO & Content' },
  { full_name: 'Talha Azeem', role: 'owner', job_title: 'Technical SEO / Content Strategist' },
  { full_name: 'Usman Ali', role: 'owner', job_title: 'Web Developer' },
  { full_name: 'Najma Furqan', role: 'owner', job_title: 'Content Strategy Execution / Editor' },
  { full_name: 'Lavi Shamoon', role: 'owner', job_title: 'SME Writer' },
  { full_name: 'Syed Ali', role: 'owner', job_title: 'Director of Marketing' },
  { full_name: 'Hameed Ishaq', role: 'owner', job_title: 'Designer' },
  { full_name: 'Haroon', role: 'leadership', job_title: 'Leadership / CMO' },
  { full_name: 'Adeela', role: 'leadership', job_title: 'CPA Reviewer' },
]
