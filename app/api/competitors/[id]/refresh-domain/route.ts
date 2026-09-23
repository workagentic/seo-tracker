import { NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/auth'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { fetchDomainRegistration } from '@/lib/rdap/client'

// Manual "Refresh domain info" action -- admin-only, matching this route's sibling
// add/edit/delete competitor routes. Domain registration data barely changes, so this is
// only needed the rare time a domain gets renewed/transferred.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const profile = await getCurrentProfile()
  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = createAdminSupabaseClient()
  const { data: competitor, error: fetchError } = await admin
    .from('competitors')
    .select('domain')
    .eq('id', id)
    .single()
  if (fetchError || !competitor) {
    return NextResponse.json({ error: 'Competitor not found' }, { status: 404 })
  }

  const registration = await fetchDomainRegistration((competitor as { domain: string }).domain)
  if (!registration) {
    return NextResponse.json({ error: 'Domain registration lookup failed' }, { status: 502 })
  }

  const { data, error } = await admin
    .from('competitors')
    .update({
      domain_created_at: registration.created_at,
      domain_expires_at: registration.expires_at,
      domain_updated_at: registration.updated_at,
    } as never)
    .eq('id', id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ competitor: data })
}
