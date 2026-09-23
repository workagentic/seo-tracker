import { NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/auth'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { fetchDomainRegistration } from '@/lib/rdap/client'

export async function POST(request: Request) {
  const profile = await getCurrentProfile()
  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const body = await request.json()
  if (!body.company_name || !body.domain) {
    return NextResponse.json({ error: 'company_name and domain are required' }, { status: 400 })
  }
  const admin = createAdminSupabaseClient()
  const { data, error } = await admin
    .from('competitors')
    .insert({ company_name: body.company_name, domain: body.domain } as never)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Best-effort domain-age lookup (RDAP) -- never blocks competitor creation if it fails.
  const registration = await fetchDomainRegistration(body.domain)
  if (registration) {
    const { data: updated } = await admin
      .from('competitors')
      .update({
        domain_created_at: registration.created_at,
        domain_expires_at: registration.expires_at,
        domain_updated_at: registration.updated_at,
      } as never)
      .eq('id', (data as { id: string }).id)
      .select()
      .single()
    if (updated) return NextResponse.json({ competitor: updated })
  }

  return NextResponse.json({ competitor: data })
}
