import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchClarityInsights } from '@/lib/clarity/client'

export interface ClaritySyncResult {
  status: number
  body: { snapshot: unknown } | { error: string }
}

// DB-integration logic, same shape as lib/ga4/sync.ts and lib/gsc/sync.ts — untested per
// this codebase's convention (needs a live Supabase client).
export async function runClaritySync(admin: SupabaseClient, triggeredBy: string | null): Promise<ClaritySyncResult> {
  let metrics
  try {
    metrics = await fetchClarityInsights()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Clarity sync failed'
    await admin.from('sync_logs').insert({ source: 'clarity', status: 'error', message, triggered_by: triggeredBy } as never)
    return { status: 502, body: { error: message } }
  }

  const snapshotDate = new Date().toISOString().slice(0, 10)
  const fields = {
    total_sessions: metrics.totalSessions,
    bot_sessions: metrics.botSessions,
    distinct_users: metrics.distinctUsers,
    dead_click_count: metrics.deadClickCount,
    rage_click_count: metrics.rageClickCount,
    script_error_count: metrics.scriptErrorCount,
    avg_scroll_depth: metrics.avgScrollDepth,
    top_pages: metrics.topPages,
  }

  const { data: existing } = await admin
    .from('clarity_snapshots')
    .select('id')
    .eq('snapshot_date', snapshotDate)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data, error } = existing
    ? await admin
        .from('clarity_snapshots')
        .update(fields as never)
        .eq('id', (existing as { id: string }).id)
        .select()
        .single()
    : await admin
        .from('clarity_snapshots')
        .insert({ snapshot_date: snapshotDate, ...fields, created_by: triggeredBy } as never)
        .select()
        .single()

  if (error) {
    await admin.from('sync_logs').insert({ source: 'clarity', status: 'error', message: error.message, triggered_by: triggeredBy } as never)
    return { status: 500, body: { error: error.message } }
  }

  await admin.from('sync_logs').insert({
    source: 'clarity',
    status: 'success',
    message: `Synced Clarity (trailing 3 days) — snapshot ${snapshotDate}`,
    triggered_by: triggeredBy,
  } as never)

  return { status: 200, body: { snapshot: data } }
}
