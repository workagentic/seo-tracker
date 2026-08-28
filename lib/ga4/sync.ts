import type { SupabaseClient } from '@supabase/supabase-js'
import { getAppSettings } from '@/lib/settings'
import { fetchGa4Metrics } from '@/lib/ga4/client'

export interface Ga4SyncResult {
  status: number
  body: { snapshot: unknown } | { error: string }
}

// DB-integration logic, same shape as lib/gsc/sync.ts and lib/ahrefs/competitorSync.ts —
// untested per this codebase's convention (needs a live Supabase client).
export async function runGa4Sync(admin: SupabaseClient, triggeredBy: string | null): Promise<Ga4SyncResult> {
  const settings = await getAppSettings(admin)

  if (!settings.ga4_property_id) {
    const message = 'GA4 property ID is not configured — set it via /admin/settings'
    await admin.from('sync_logs').insert({ source: 'ga4', status: 'error', message, triggered_by: triggeredBy } as never)
    return { status: 502, body: { error: message } }
  }

  let metrics
  try {
    metrics = await fetchGa4Metrics(settings.ga4_property_id)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'GA4 sync failed'
    await admin.from('sync_logs').insert({ source: 'ga4', status: 'error', message, triggered_by: triggeredBy } as never)
    return { status: 502, body: { error: message } }
  }

  const snapshotDate = new Date().toISOString().slice(0, 10)
  const fields = {
    sessions_global: metrics.global.sessions,
    users_global: metrics.global.totalUsers,
    new_users_global: metrics.global.newUsers,
    bounce_rate_global: metrics.global.bounceRate,
    avg_session_duration_global: metrics.global.averageSessionDuration,
    sessions_us: metrics.us.sessions,
    users_us: metrics.us.totalUsers,
    new_users_us: metrics.us.newUsers,
    bounce_rate_us: metrics.us.bounceRate,
    avg_session_duration_us: metrics.us.averageSessionDuration,
  }

  // Patch today's row instead of duplicating it, same pattern as metric_snapshots/keyword_history.
  const { data: existing } = await admin
    .from('ga4_snapshots')
    .select('id')
    .eq('snapshot_date', snapshotDate)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data, error } = existing
    ? await admin
        .from('ga4_snapshots')
        .update(fields as never)
        .eq('id', (existing as { id: string }).id)
        .select()
        .single()
    : await admin
        .from('ga4_snapshots')
        .insert({ snapshot_date: snapshotDate, ...fields, created_by: triggeredBy } as never)
        .select()
        .single()

  if (error) {
    await admin.from('sync_logs').insert({ source: 'ga4', status: 'error', message: error.message, triggered_by: triggeredBy } as never)
    return { status: 500, body: { error: error.message } }
  }

  await admin.from('sync_logs').insert({
    source: 'ga4',
    status: 'success',
    message: `Synced GA4 property ${settings.ga4_property_id} — snapshot ${snapshotDate}`,
    triggered_by: triggeredBy,
  } as never)

  return { status: 200, body: { snapshot: data } }
}
