import type { SupabaseClient } from '@supabase/supabase-js'
import { ACCOUNTABILITY_MAP } from '@/lib/constants'
import type { MetricAccountability } from '@/types'

// Falls back to the original hardcoded constant if the table is empty (e.g. migration 0027
// hasn't been run yet against this environment) -- mirrors lib/targets.ts's pattern.
export async function getAccountabilityMap(supabase: SupabaseClient): Promise<Record<string, string[]>> {
  const { data } = await supabase.from('metric_accountability').select('*')
  const rows = (data as MetricAccountability[]) ?? []
  if (rows.length === 0) return ACCOUNTABILITY_MAP

  const result: Record<string, string[]> = {}
  for (const row of rows) result[row.metric_key] = row.owner_names
  return result
}
