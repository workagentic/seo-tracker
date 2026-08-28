import { NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/auth'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import type { Task } from '@/types'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const profile = await getCurrentProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminSupabaseClient()
  const { data: task } = (await admin.from('tasks').select('assigned_to, co_assigned_to').eq('id', id).single()) as unknown as {
    data: Pick<Task, 'assigned_to' | 'co_assigned_to'> | null
  }
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isOwnerOfTask = task.assigned_to === profile.id || task.co_assigned_to === profile.id
  const canEditAny = profile.role === 'admin' || profile.role === 'head'
  if (!canEditAny && !(profile.role === 'owner' && isOwnerOfTask)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const allowedFields: Record<string, unknown> = {}
  if (typeof body.status === 'string') allowedFields.status = body.status
  if (typeof body.notes === 'string') allowedFields.notes = body.notes

  // Structural fields (everything beyond status/notes) are admin-only, distinct from the
  // head/owner status-editing permission above.
  if (profile.role === 'admin') {
    if (typeof body.action_number === 'string') allowedFields.action_number = body.action_number
    if (typeof body.title === 'string') allowedFields.title = body.title
    if (typeof body.description === 'string' || body.description === null) allowedFields.description = body.description
    if (typeof body.position_responsible === 'string' || body.position_responsible === null) {
      allowedFields.position_responsible = body.position_responsible
    }
    if (typeof body.assigned_to === 'string' || body.assigned_to === null) allowedFields.assigned_to = body.assigned_to
    if (typeof body.co_assigned_to === 'string' || body.co_assigned_to === null) allowedFields.co_assigned_to = body.co_assigned_to
    if (typeof body.due_date === 'string' || body.due_date === null) allowedFields.due_date = body.due_date
    if (typeof body.quarter === 'string' || body.quarter === null) allowedFields.quarter = body.quarter
  } else if (
    body.action_number !== undefined || body.title !== undefined || body.assigned_to !== undefined ||
    body.co_assigned_to !== undefined || body.due_date !== undefined || body.quarter !== undefined ||
    body.description !== undefined || body.position_responsible !== undefined
  ) {
    return NextResponse.json({ error: 'Only admins can edit task details beyond status/notes' }, { status: 403 })
  }

  if (allowedFields.status === 'completed') allowedFields.completed_at = new Date().toISOString()
  allowedFields.updated_at = new Date().toISOString()
  allowedFields.updated_by = profile.id

  const result = await admin.from('tasks').update(allowedFields as never).eq('id', id).select().single()
  const { data, error } = result as unknown as { data: Task | null; error: { message: string } | null }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ task: data })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const profile = await getCurrentProfile()
  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const admin = createAdminSupabaseClient()
  const { error } = await admin.from('tasks').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
