import { NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/auth'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const profile = await getCurrentProfile()
  if (!profile || !['admin', 'senior'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const update: Record<string, unknown> = {}
  if (typeof body.is_active === 'boolean') update.is_active = body.is_active
  if (typeof body.requires_submission_from === 'boolean') update.requires_submission_from = body.requires_submission_from
  if (typeof body.name === 'string' && body.name.trim()) update.name = body.name.trim()

  const admin = createAdminSupabaseClient()
  const { error } = await admin.from('lead_sources').update(update as never).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const profile = await getCurrentProfile()
  if (!profile || !['admin', 'senior'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = createAdminSupabaseClient()
  const { error } = await admin.from('lead_sources').delete().eq('id', id)
  if (error) {
    // Leads referencing this source block the delete (no ON DELETE action on
    // leads.source_id) -- surface that as a clear message instead of a raw FK error.
    const message = error.message.includes('foreign key')
      ? 'Cannot delete a source that has leads using it — deactivate it instead'
      : error.message
    return NextResponse.json({ error: message }, { status: 409 })
  }
  return NextResponse.json({ ok: true })
}
