import { NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/auth'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; optionId: string }> }) {
  const { optionId } = await params
  const profile = await getCurrentProfile()
  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const update: Record<string, unknown> = {}
  if (typeof body.label === 'string' && body.label.trim()) update.label = body.label.trim()
  if (typeof body.is_active === 'boolean') update.is_active = body.is_active

  const admin = createAdminSupabaseClient()
  const { error } = await admin.from('lead_source_submission_options').update(update as never).eq('id', optionId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; optionId: string }> }) {
  const { optionId } = await params
  const profile = await getCurrentProfile()
  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = createAdminSupabaseClient()
  const { error } = await admin.from('lead_source_submission_options').delete().eq('id', optionId)
  if (error) {
    const message = error.message.includes('foreign key')
      ? 'Cannot delete an option that leads are using — deactivate it instead'
      : error.message
    return NextResponse.json({ error: message }, { status: 409 })
  }
  return NextResponse.json({ ok: true })
}
