import type { SupabaseClient } from '@supabase/supabase-js'
import type { QuarterTarget } from '@/types'
import { QUARTERLY_TARGETS } from '@/lib/constants'

interface QuarterlyTargetRow {
  quarter_key: string
  label: string
  target_date: string
  domain_rating: number | null
  organic_traffic_global: number | null
  organic_traffic_us: number | null
  organic_keywords_global: number | null
  organic_keywords_us: number | null
  keywords_top_3: number | null
  keywords_top_10: number | null
  traffic_value_monthly: number | null
  referring_domains_total: number | null
  referring_domains_quality: number | null
  avg_keywords_per_page: number | null
  indexed_content_pages: number | null
}

function rowToTarget(row: QuarterlyTargetRow): QuarterTarget {
  return {
    label: row.label,
    date: row.target_date,
    domain_rating: row.domain_rating ?? 0,
    organic_traffic_global: row.organic_traffic_global ?? 0,
    organic_traffic_us: row.organic_traffic_us ?? 0,
    organic_keywords_global: row.organic_keywords_global ?? 0,
    organic_keywords_us: row.organic_keywords_us ?? 0,
    keywords_top_3: row.keywords_top_3 ?? 0,
    keywords_top_10: row.keywords_top_10 ?? 0,
    traffic_value_monthly: row.traffic_value_monthly ?? 0,
    referring_domains_total: row.referring_domains_total ?? 0,
    referring_domains_quality: row.referring_domains_quality ?? 0,
    avg_keywords_per_page: row.avg_keywords_per_page ?? 0,
    indexed_content_pages: row.indexed_content_pages ?? 0,
  }
}

// Falls back to the original hardcoded constant if the table is empty (e.g. migration
// 0007 hasn't been run yet against this environment) — mirrors lib/settings.ts's pattern.
export async function getQuarterlyTargets(supabase: SupabaseClient): Promise<Record<string, QuarterTarget>> {
  const { data } = await supabase.from('quarterly_targets').select('*')
  const rows = (data as QuarterlyTargetRow[]) ?? []
  if (rows.length === 0) return QUARTERLY_TARGETS

  const result: Record<string, QuarterTarget> = {}
  for (const row of rows) result[row.quarter_key] = rowToTarget(row)
  return result
}

// getCurrentQuarter()'s computed key (e.g. 'Q3-2026') may have no defined target row yet --
// the program hasn't set targets that far ahead. Falls back to the latest defined quarter
// target (by date) rather than a hardcoded key, since calendar quarters keep recurring and
// any fixed fallback key would eventually stop existing too. Replaces the old
// `allTargets[quarter] ?? allTargets.Q1` pattern used at every getCurrentQuarter() call site.
export function resolveTarget(allTargets: Record<string, QuarterTarget>, quarterKey: string): QuarterTarget {
  if (allTargets[quarterKey]) return allTargets[quarterKey]
  const nonBaseline = Object.entries(allTargets)
    .filter(([key]) => key !== 'baseline')
    .sort((a, b) => a[1].date.localeCompare(b[1].date))
  return nonBaseline[nonBaseline.length - 1]?.[1] ?? allTargets.baseline
}
