import { NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/auth'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const profile = await getCurrentProfile()
  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const update: Record<string, unknown> = {}
  if (typeof body.is_active === 'boolean') update.is_active = body.is_active
  if (typeof body.requires_submission_from === 'boolean') update.requires_submission_from = body.requires_submission_from

  const admin = createAdminSupabaseClient()
  const { error } = await admin.from('lead_sources').update(update as never).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
