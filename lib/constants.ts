import type { QuarterTarget, Role } from '@/types'

// Keys/labels relabeled 2 Sep 2026 (CLAUDE.md Section 14, Phase 1 of the Task Tracker/Quarter
// overhaul) from "programme quarters" (Q1-Q5 counted up from kickoff) to real, year-qualified
// calendar quarters -- see getCurrentQuarter() below. Every target-date/number is unchanged:
// each old quarter-end date already lined up with a real calendar-quarter end (old Q1 end
// 2026-09-30 = end of calendar Q3 2026, old Q2 end 2026-12-31 = end of calendar Q4 2026, etc.),
// so this was a pure relabel. Mirrors the `quarterly_targets` table (migration
// 0023_calendar_quarter_boundaries.sql), which is the live source of truth --
// this object is only the seed/fallback (see lib/targets.ts's getQuarterlyTargets()).
export const QUARTERLY_TARGETS: Record<
  'baseline' | 'Q3-2026' | 'Q4-2026' | 'Q1-2027' | 'Q2-2027' | 'Q3-2027',
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
  'Q3-2026': {
    label: 'Q3 2026', date: '2026-09-30', domain_rating: 25,
    organic_traffic_global: 520, organic_traffic_us: 480,
    organic_keywords_global: 240, organic_keywords_us: 190,
    keywords_top_3: 34, keywords_top_10: 189, traffic_value_monthly: 2900,
    referring_domains_total: 900, referring_domains_quality: 75,
    avg_keywords_per_page: 4, indexed_content_pages: 60,
  },
  'Q4-2026': {
    label: 'Q4 2026', date: '2026-12-31', domain_rating: 32,
    organic_traffic_global: 1600, organic_traffic_us: 1470,
    organic_keywords_global: 700, organic_keywords_us: 550,
    keywords_top_3: 105, keywords_top_10: 505, traffic_value_monthly: 8500,
    referring_domains_total: 1030, referring_domains_quality: 160,
    avg_keywords_per_page: 8, indexed_content_pages: 100,
  },
  'Q1-2027': {
    label: 'Q1 2027', date: '2027-03-31', domain_rating: 39,
    organic_traffic_global: 2900, organic_traffic_us: 2670,
    organic_keywords_global: 1250, organic_keywords_us: 985,
    keywords_top_3: 205, keywords_top_10: 875, traffic_value_monthly: 16000,
    referring_domains_total: 1180, referring_domains_quality: 260,
    avg_keywords_per_page: 13, indexed_content_pages: 155,
  },
  'Q2-2027': {
    label: 'Q2 2027', date: '2027-06-30', domain_rating: 45,
    organic_traffic_global: 4800, organic_traffic_us: 4450,
    organic_keywords_global: 1950, organic_keywords_us: 1540,
    keywords_top_3: 370, keywords_top_10: 1390, traffic_value_monthly: 28000,
    referring_domains_total: 1350, referring_domains_quality: 370,
    avg_keywords_per_page: 18, indexed_content_pages: 210,
  },
  'Q3-2027': {
    label: 'Q3 2027', date: '2027-09-30', domain_rating: 50,
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

// Standard, repeating calendar quarters (Q1=Jan-Mar, Q2=Apr-Jun, Q3=Jul-Sep, Q4=Oct-Dec),
// computed generically for any year -- replaces the old fixed 5-entry QUARTER_BOUNDARIES
// array (programme quarters counted up from the 24 Aug 2026 kickoff), which needed manual
// extension by hand every time the programme ran into a new quarter. See CLAUDE.md Section 14
// Phase 1. Uses UTC fields throughout (matches the old code's ISO-string date comparisons and
// how Vercel functions run) so this doesn't depend on server timezone.
export function getCalendarQuarter(date: Date): { quarterNumber: 1 | 2 | 3 | 4; year: number } {
  const quarterNumber = (Math.floor(date.getUTCMonth() / 3) + 1) as 1 | 2 | 3 | 4
  return { quarterNumber, year: date.getUTCFullYear() }
}

// Bare label with no year, e.g. 'Q3' -- what tasks.quarter stores (Section 14 Phase 1: "tasks
// reuse bare 'Q1'-'Q4' every year"), and what the Task Tracker's quarter filter offers.
export function getCalendarQuarterLabel(date: Date): string {
  return `Q${getCalendarQuarter(date).quarterNumber}`
}

// Year-qualified key, e.g. 'Q3-2026' -- matches quarterly_targets.quarter_key (migration
// 0023_calendar_quarter_boundaries.sql) so this indexes straight into getQuarterlyTargets()'s
// result without a separate lookup.
export function getCurrentQuarter(date: Date): string {
  const { quarterNumber, year } = getCalendarQuarter(date)
  return `Q${quarterNumber}-${year}`
}

// Roles reassigned 28 Aug 2026 (CLAUDE.md Section 12.10): Syed Ali and Haroon promoted to
// admin, Tabish moved from head to owner. Kept in sync here so a re-run of
// scripts/seed-users.ts wouldn't seed the old roles.
export const TEAM_MEMBERS: { full_name: string; role: Role; job_title: string }[] = [
  { full_name: 'Abdullah Shekha', role: 'admin', job_title: 'Analyst / Supervisor' },
  { full_name: 'Tabish Khalid', role: 'owner', job_title: 'Head of SEO & Content' },
  { full_name: 'Talha Azeem', role: 'owner', job_title: 'Technical SEO / Content Strategist' },
  { full_name: 'Usman Ali', role: 'owner', job_title: 'Web Developer' },
  { full_name: 'Najma Furqan', role: 'owner', job_title: 'Content Strategy Execution / Editor' },
  { full_name: 'Lavi Shamoon', role: 'owner', job_title: 'SME Writer' },
  { full_name: 'Syed Ali', role: 'admin', job_title: 'Director of Marketing' },
  { full_name: 'Hameed Ishaq', role: 'owner', job_title: 'Designer' },
  { full_name: 'Haroon', role: 'admin', job_title: 'Leadership / CMO' },
  { full_name: 'Adeela', role: 'leadership', job_title: 'CPA Reviewer' },
]
