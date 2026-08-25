import type { SupabaseClient } from '@supabase/supabase-js'
import type { MetricSnapshot } from '@/types'

export async function getLatestSnapshot(
  supabase: SupabaseClient
): Promise<MetricSnapshot | null> {
  const { data } = await supabase
    .from('metric_snapshots')
    .select('*')
    .order('snapshot_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return (data as MetricSnapshot) ?? null
}

export async function getAllSnapshots(supabase: SupabaseClient): Promise<MetricSnapshot[]> {
  const { data } = await supabase
    .from('metric_snapshots')
    .select('*')
    .order('snapshot_date', { ascending: true })
  return (data as MetricSnapshot[]) ?? []
}
