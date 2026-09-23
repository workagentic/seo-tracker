import { NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/auth'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { getAppSettings } from '@/lib/settings'
import { fetchDomainRegistration } from '@/lib/rdap/client'

// EA's own equivalent of /api/competitors/[id]/refresh-domain -- admin-only, refreshes
// app_settings' domain_created_at/expires_at/updated_at from the current target_domain.
export async function POST() {
  const profile = await getCurrentProfile()
  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = createAdminSupabaseClient()
  const settings = await getAppSettings(admin)

  const registration = await fetchDomainRegistration(settings.target_domain)
  if (!registration) {
    return NextResponse.json({ error: 'Domain registration lookup failed' }, { status: 502 })
  }

  const { data, error } = await admin
    .from('app_settings')
    .update({
      domain_created_at: registration.created_at,
      domain_expires_at: registration.expires_at,
      domain_updated_at: registration.updated_at,
    } as never)
    .eq('id', true)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ settings: data })
}
