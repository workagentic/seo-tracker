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
  if (typeof body.name !== 'string' || !body.name.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }

  const admin = createAdminSupabaseClient()
  const { error } = await admin.from('task_categories').update({ name: body.name.trim() } as never).eq('id', id)
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
  const { error } = await admin.from('task_categories').delete().eq('id', id)
  if (error) {
    const message = /foreign key|violates/i.test(error.message)
      ? 'Cannot delete a category that tasks are still using'
      : error.message
    return NextResponse.json({ error: message }, { status: 409 })
  }
  return NextResponse.json({ ok: true })
}
