import type { SupabaseClient } from '@supabase/supabase-js'
import type { ClaritySnapshot } from '@/types'

export async function getLatestClaritySnapshot(supabase: SupabaseClient): Promise<ClaritySnapshot | null> {
  const { data } = await supabase
    .from('clarity_snapshots')
    .select('*')
    .order('snapshot_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return (data as ClaritySnapshot) ?? null
}
