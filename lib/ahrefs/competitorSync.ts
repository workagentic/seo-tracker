import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchAhrefsCompetitorMetrics, AHREFS_INTER_DOMAIN_DELAY_MS } from '@/lib/ahrefs/client'
import type { Competitor } from '@/types'

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export interface CompetitorSyncResult {
  status: number
  body:
    | { results: { domain: string; status: 'success' | 'error'; message?: string }[]; summary: string }
    | { error: string }
}

// DB-integration logic extracted from app/api/competitors/sync/route.ts so both the manual
// sync button and the weekly cron (app/api/cron/weekly-snapshot/route.ts) can call it.
// Untested, same as every other sync route in this codebase — needs a live Supabase client.
export async function runCompetitorSync(admin: SupabaseClient, triggeredBy: string | null): Promise<CompetitorSyncResult> {
  const { data: competitors, error: fetchError } = await admin.from('competitors').select('*').eq('is_active', true)
  if (fetchError) return { status: 500, body: { error: fetchError.message } }

  // Ahrefs' 1 req/sec limit (CLAUDE.md Section 7.1) is account-wide, not per-domain, so
  // competitors are synced strictly one at a time with a delay between each.
  const results: { domain: string; status: 'success' | 'error'; message?: string }[] = []
  const active = (competitors as Competitor[]) ?? []

  for (let i = 0; i < active.length; i++) {
    const competitor = active[i]
    try {
      const metrics = await fetchAhrefsCompetitorMetrics(competitor.domain)
      const { error } = await admin
        .from('competitors')
        .update({
          domain_rating: metrics.domain_rating,
          organic_traffic: metrics.organic_traffic,
          organic_keywords: metrics.organic_keywords,
          keywords_top_3: metrics.keywords_top_3,
          est_traffic_value: metrics.traffic_value_monthly,
          referring_domains: metrics.referring_domains_total,
          last_synced_at: new Date().toISOString(),
        } as never)
        .eq('id', competitor.id)
      if (error) throw new Error(error.message)
      results.push({ domain: competitor.domain, status: 'success' })
    } catch (err) {
      results.push({
        domain: competitor.domain,
        status: 'error',
        message: err instanceof Error ? err.message : 'Unknown error',
      })
    }
    if (i < active.length - 1) await sleep(AHREFS_INTER_DOMAIN_DELAY_MS)
  }

  const succeeded = results.filter((r) => r.status === 'success').length
  const failed = results.filter((r) => r.status === 'error')
  const summary =
    failed.length === 0
      ? `Synced ${succeeded}/${results.length} competitors`
      : `Synced ${succeeded}/${results.length} competitors; failed: ${failed.map((f) => `${f.domain} (${f.message})`).join(', ')}`

  await admin.from('sync_logs').insert({
    source: 'competitors',
    status: failed.length === 0 ? 'success' : 'error',
    message: summary,
    triggered_by: triggeredBy,
  } as never)

  return { status: 200, body: { results, summary } }
}
