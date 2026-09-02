import { NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/auth'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  const profile = await getCurrentProfile()
  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  if (!body.lead_date || !body.full_name) {
    return NextResponse.json({ error: 'lead_date and full_name are required' }, { status: 400 })
  }

  const admin = createAdminSupabaseClient()
  const { data, error } = await admin
    .from('leads')
    .insert({
      stage: 'new_lead',
      lead_date: body.lead_date,
      full_name: body.full_name,
      company_name: body.company_name || null,
      email: body.email || null,
      phone_number: body.phone_number || null,
      revenue: body.revenue || null,
      service_needed: body.service_needed || null,
      brand: body.brand || null,
      employee_size: body.employee_size || null,
      source_id: body.source_id || null,
      point_of_contact: body.point_of_contact || null,
      submission_from: body.submission_from || null,
      created_by: profile.id,
      updated_by: profile.id,
    } as never)
    .select('*, source:source_id(id, name, requires_submission_from)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ lead: data })
}
