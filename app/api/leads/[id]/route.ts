import { NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/auth'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'

const EDITABLE_FIELDS = [
  'stage', 'lead_date', 'full_name', 'company_name', 'email', 'phone_number', 'revenue',
  'service_needed', 'brand', 'employee_size', 'source_id', 'point_of_contact',
  'submission_from_id', 'intro_call_date', 'intro_call_status', 'intro_call_meeting_minutes',
  'intro_call_email_sent', 'followup_1_scheduled_date', 'followup_1_date', 'followup_1_notes',
  'followup_1_email_sent', 'followup_2_scheduled_date', 'followup_2_date', 'followup_2_notes',
  'followup_2_email_sent', 'followup_3_scheduled_date', 'followup_3_date', 'followup_3_notes',
  'followup_3_email_sent', 'won_date', 'won_notes', 'conversion_value', 'lost_date',
  'lost_notes',
] as const

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const profile = await getCurrentProfile()
  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const update: Record<string, unknown> = { updated_by: profile.id, updated_at: new Date().toISOString() }
  for (const field of EDITABLE_FIELDS) {
    if (field in body) update[field] = body[field]
  }

  const admin = createAdminSupabaseClient()
  const { data, error } = await admin
    .from('leads')
    .update(update as never)
    .eq('id', id)
    .select('*, source:source_id(id, name, requires_submission_from)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ lead: data })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const profile = await getCurrentProfile()
  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const admin = createAdminSupabaseClient()
  const { error } = await admin.from('leads').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
