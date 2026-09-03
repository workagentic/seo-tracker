import { NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/auth'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import type { MetricKey } from '@/types'

const METRIC_KEYS: MetricKey[] = [
  'domain_rating', 'organic_traffic_global', 'organic_traffic_us',
  'organic_keywords_global', 'organic_keywords_us', 'keywords_top_3',
  'keywords_top_10', 'traffic_value_monthly', 'referring_domains_total',
  'referring_domains_quality', 'avg_keywords_per_page', 'indexed_content_pages',
]

export async function POST(request: Request) {
  const profile = await getCurrentProfile()
  if (!profile || !['admin', 'senior'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  if (!body.snapshot_date || !body.quarter_label) {
    return NextResponse.json({ error: 'snapshot_date and quarter_label are required' }, { status: 400 })
  }

  const admin = createAdminSupabaseClient()

  // A sync or an earlier manual entry may have already created today's snapshot (e.g. Ahrefs
  // sync populates the automated fields, then an admin fills in the manual-census fields).
  // Patch that row instead of inserting a duplicate that would shadow it as "latest".
  const { data: existing } = await admin
    .from('metric_snapshots')
    .select('id')
    .eq('snapshot_date', body.snapshot_date)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing) {
    const patch: Record<string, unknown> = { quarter_label: body.quarter_label }
    if (body.notes) patch.notes = body.notes
    for (const key of METRIC_KEYS) {
      if (body[key] !== undefined && body[key] !== '') patch[key] = Number(body[key])
    }
    const { data, error } = await admin
      .from('metric_snapshots')
      .update(patch as never)
      .eq('id', (existing as { id: string }).id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ snapshot: data })
  }

  const payload: Record<string, unknown> = {
    snapshot_date: body.snapshot_date,
    quarter_label: body.quarter_label,
    notes: body.notes ?? null,
    created_by: profile.id,
  }
  for (const key of METRIC_KEYS) {
    payload[key] = body[key] !== undefined && body[key] !== '' ? Number(body[key]) : null
  }

  const { data, error } = await admin.from('metric_snapshots').insert(payload as never).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ snapshot: data })
}
