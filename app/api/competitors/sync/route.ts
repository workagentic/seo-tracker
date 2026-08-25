import { NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/auth'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { fetchAhrefsCompetitorMetrics, AHREFS_INTER_DOMAIN_DELAY_MS } from '@/lib/ahrefs/client'
import type { Competitor } from '@/types'

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function POST() {
  const profile = await getCurrentProfile()
  if (!profile || !['admin', 'head'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = createAdminSupabaseClient()
  const { data: competitors, error: fetchError } = await admin
    .from('competitors')
    .select('*')
    .eq('is_active', true)

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 })

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
    triggered_by: profile.id,
  } as never)

  return NextResponse.json({ results, summary })
}
