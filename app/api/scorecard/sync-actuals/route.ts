import { NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/auth'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { getAppSettings } from '@/lib/settings'
import { fetchGscQueryPositions } from '@/lib/gsc/client'
import { computeGscScorecardMetrics } from '@/lib/gsc/scorecard'
import { fetchAhrefsMetrics } from '@/lib/ahrefs/client'
import { canSyncScorecardActuals } from '@/lib/scorecard'

// Scorecard Actual/Variance auto-sync (CLAUDE.md Section 14 Phase 5). Fixed source priority,
// confirmed with Abdullah: GSC-sourced for Organic Traffic Global/US, Organic Keywords
// Global/US, Keywords Top 3, Keywords Top 10, Indexed Content Pages (lib/gsc/scorecard.ts);
// Ahrefs fallback (reusing the same fetchAhrefsMetrics the main Ahrefs sync uses) for Domain
// Rating, Traffic Value Monthly, Referring Domains Total, Avg Keywords per Page. GA4 covers
// none of the 12 KPIs cleanly (it measures sessions/users, not organic-search rank data) so
// it's not a source here. Referring Domains Quality stays manual-only, untouched.
export async function POST() {
  const profile = await getCurrentProfile()
  if (!profile || !canSyncScorecardActuals(profile)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = createAdminSupabaseClient()
  const settings = await getAppSettings(admin)

  if (!settings.gsc_site_url) {
    const message = 'GSC site URL is not configured — set it via /admin/settings'
    await admin.from('sync_logs').insert({ source: 'scorecard-actuals', status: 'error', message, triggered_by: profile.id } as never)
    return NextResponse.json({ error: message }, { status: 502 })
  }

  let globalRows, usRows, ahrefs
  try {
    ;[globalRows, usRows] = await Promise.all([
      fetchGscQueryPositions(settings.gsc_site_url),
      fetchGscQueryPositions(settings.gsc_site_url, 90, 'usa'),
    ])
    ahrefs = await fetchAhrefsMetrics(settings.target_domain)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Scorecard actuals sync failed'
    await admin.from('sync_logs').insert({ source: 'scorecard-actuals', status: 'error', message, triggered_by: profile.id } as never)
    return NextResponse.json({ error: message }, { status: 502 })
  }

  const global = computeGscScorecardMetrics(globalRows)
  const us = computeGscScorecardMetrics(usRows)

  const automatedFields = {
    organic_traffic_global: global.trafficSum,
    organic_traffic_us: us.trafficSum,
    organic_keywords_global: global.keywordCount,
    organic_keywords_us: us.keywordCount,
    keywords_top_3: global.keywordsTop3,
    keywords_top_10: global.keywordsTop10,
    indexed_content_pages: global.indexedPages,
    domain_rating: ahrefs.domain_rating,
    traffic_value_monthly: ahrefs.traffic_value_monthly,
    referring_domains_total: ahrefs.referring_domains_total,
    avg_keywords_per_page: ahrefs.avg_keywords_per_page,
  }

  const snapshotDate = new Date().toISOString().slice(0, 10)

  // Patch pattern -- same as /api/sync/ahrefs: don't shadow a same-day manual entry
  // (e.g. referring_domains_quality) with a duplicate row.
  const { data: existing } = await admin
    .from('metric_snapshots')
    .select('id')
    .eq('snapshot_date', snapshotDate)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data, error } = existing
    ? await admin
        .from('metric_snapshots')
        .update(automatedFields as never)
        .eq('id', (existing as { id: string }).id)
        .select()
        .single()
    : await admin
        .from('metric_snapshots')
        .insert({
          snapshot_date: snapshotDate,
          ...automatedFields,
          created_by: profile.id,
        } as never)
        .select()
        .single()

  if (error) {
    await admin.from('sync_logs').insert({ source: 'scorecard-actuals', status: 'error', message: error.message, triggered_by: profile.id } as never)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await admin.from('sync_logs').insert({
    source: 'scorecard-actuals',
    status: 'success',
    message: `Synced GSC + Ahrefs actuals for ${snapshotDate}`,
    triggered_by: profile.id,
  } as never)

  return NextResponse.json({ snapshot: data })
}
