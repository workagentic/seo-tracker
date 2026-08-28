import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { runGscSync } from '@/lib/gsc/sync'
import { runCompetitorSync } from '@/lib/ahrefs/competitorSync'
import type { Competitor } from '@/types'

// Vercel Cron has no logged-in user, so this route authenticates via a shared secret
// (Vercel sends `Authorization: Bearer ${CRON_SECRET}` for jobs configured with a secret)
// instead of getCurrentProfile()'s session check that every other sync route uses.
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminSupabaseClient()

  const gsc = await runGscSync(admin, null)
  const competitors = await runCompetitorSync(admin, null)

  const { data: activeCompetitors } = await admin.from('competitors').select('*').eq('is_active', true)
  const today = new Date().toISOString().slice(0, 10)

  let snapshotted = 0
  for (const c of (activeCompetitors as Competitor[]) ?? []) {
    const { error } = await admin.from('competitor_snapshots').insert({
      competitor_id: c.id,
      snapshot_date: today,
      domain_rating: c.domain_rating,
      organic_traffic: c.organic_traffic,
      organic_keywords: c.organic_keywords,
      keywords_top_3: c.keywords_top_3,
      est_traffic_value: c.est_traffic_value,
      referring_domains: c.referring_domains,
    } as never)
    if (!error) snapshotted++
  }

  const summary = `Weekly snapshot: GSC ${JSON.stringify(gsc.body)}; competitors ${JSON.stringify(
    competitors.body
  )}; snapshotted ${snapshotted} competitor(s)`

  await admin.from('sync_logs').insert({
    source: 'weekly-cron',
    status: gsc.status === 200 && competitors.status === 200 ? 'success' : 'error',
    message: summary,
    triggered_by: null,
  } as never)

  return NextResponse.json({ gsc: gsc.body, competitors: competitors.body, snapshotted })
}
