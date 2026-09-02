import { NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/auth'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import type { Role } from '@/types'

// Real edit (name/role/job title) and delete for users (CLAUDE.md Section 14 Phase 4) --
// previously only create + the is_active "lock" toggle existed. "Lock" stays the same
// is_active concept, just exposed alongside real edit/delete here instead of being the only
// option.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const profile = await getCurrentProfile()
  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const update: Record<string, unknown> = {}
  if (typeof body.full_name === 'string' && body.full_name.trim()) update.full_name = body.full_name.trim()
  if (typeof body.role === 'string') update.role = body.role as Role
  if (typeof body.job_title === 'string' || body.job_title === null) update.job_title = body.job_title
  if (typeof body.is_active === 'boolean') update.is_active = body.is_active

  const admin = createAdminSupabaseClient()
  const { error } = await admin.from('profiles').update(update as never).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const profile = await getCurrentProfile()
  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (id === profile.id) {
    return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
  }

  const admin = createAdminSupabaseClient()
  // Deletes the auth user, which cascades to the profiles row (profiles.id references
  // auth.users(id) on delete cascade). Fails if this profile is still referenced elsewhere
  // (tasks.owner_id/assigned_to_id, leads, audit_reports, etc. have no cascade) -- that's the
  // DB acting as a safety net, same as the lead_sources delete route.
  const { error } = await admin.auth.admin.deleteUser(id)
  if (error) {
    const message = /foreign key|violates/i.test(error.message)
      ? 'Cannot delete a user still referenced by existing tasks/leads/etc. — deactivate them instead'
      : error.message
    return NextResponse.json({ error: message }, { status: 409 })
  }
  return NextResponse.json({ ok: true })
}
