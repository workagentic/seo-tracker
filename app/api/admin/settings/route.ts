import { NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/auth'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  const profile = await getCurrentProfile()
  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { target_domain, gsc_site_url, ga4_property_id } = body as {
    target_domain?: string
    gsc_site_url?: string
    ga4_property_id?: string
  }
  if (!target_domain) {
    return NextResponse.json({ error: 'target_domain is required' }, { status: 400 })
  }

  const admin = createAdminSupabaseClient()
  const { data, error } = await admin
    .from('app_settings')
    .update({
      target_domain,
      gsc_site_url: gsc_site_url || null,
      ga4_property_id: ga4_property_id || null,
      updated_by: profile.id,
      updated_at: new Date().toISOString(),
    } as never)
    .eq('id', true)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ settings: data })
}
