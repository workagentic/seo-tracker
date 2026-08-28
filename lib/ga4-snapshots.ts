import type { SupabaseClient } from '@supabase/supabase-js'
import type { Ga4Snapshot } from '@/types'

export async function getLatestGa4Snapshot(supabase: SupabaseClient): Promise<Ga4Snapshot | null> {
  const { data } = await supabase
    .from('ga4_snapshots')
    .select('*')
    .order('snapshot_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return (data as Ga4Snapshot) ?? null
}
