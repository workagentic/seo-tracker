import { NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/auth'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'

const NUMERIC_FIELDS = [
  'domain_rating',
  'organic_traffic_global',
  'organic_traffic_us',
  'organic_keywords_global',
  'organic_keywords_us',
  'keywords_top_3',
  'keywords_top_10',
  'traffic_value_monthly',
  'referring_domains_total',
  'referring_domains_quality',
  'avg_keywords_per_page',
  'indexed_content_pages',
] as const

export async function PATCH(request: Request) {
  const profile = await getCurrentProfile()
  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { quarter_key } = body as { quarter_key?: string }
  if (!quarter_key) {
    return NextResponse.json({ error: 'quarter_key is required' }, { status: 400 })
  }

  const updates: Record<string, number | string> = {}
  for (const field of NUMERIC_FIELDS) {
    if (typeof body[field] === 'number') updates[field] = body[field]
  }
  updates.updated_by = profile.id
  updates.updated_at = new Date().toISOString()

  const admin = createAdminSupabaseClient()
  const { data, error } = await admin
    .from('quarterly_targets')
    .update(updates as never)
    .eq('quarter_key', quarter_key)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ target: data })
}
