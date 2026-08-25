import { NextResponse } from 'next/server'
import type { MetricSnapshot } from '@/types'
import { getCurrentProfile } from '@/lib/auth'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { fetchAhrefsMetrics } from '@/lib/ahrefs/client'
import { getCurrentQuarter } from '@/lib/constants'

const TARGET_DOMAIN = 'expertiseaccelerated.com'

export async function POST() {
  const profile = await getCurrentProfile()
  if (!profile || !['admin', 'head'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let metrics
  try {
    metrics = await fetchAhrefsMetrics(TARGET_DOMAIN)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Ahrefs sync failed' },
      { status: 502 }
    )
  }

  const admin = createAdminSupabaseClient()
  const quarter = getCurrentQuarter(new Date())

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from('metric_snapshots')
    .insert({
      snapshot_date: new Date().toISOString().slice(0, 10),
      quarter_label: quarter,
      domain_rating: metrics.domain_rating,
      organic_traffic_global: metrics.organic_traffic,
      organic_traffic_us: null,
      organic_keywords_global: metrics.organic_keywords,
      organic_keywords_us: null,
      keywords_top_3: metrics.keywords_top_3,
      keywords_top_10: metrics.keywords_top_10,
      traffic_value_monthly: metrics.traffic_value_monthly,
      referring_domains_total: metrics.referring_domains_total,
      avg_keywords_per_page: metrics.avg_keywords_per_page,
      indexed_content_pages: metrics.indexed_content_pages,
      created_by: profile.id,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ snapshot: data as unknown as MetricSnapshot })
}
