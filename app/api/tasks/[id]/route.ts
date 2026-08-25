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
  if (allowedFields.status === 'completed') allowedFields.completed_at = new Date().toISOString()
  allowedFields.updated_at = new Date().toISOString()

  const result = await admin.from('tasks').update(allowedFields as never).eq('id', id).select().single()
  const { data, error } = result as unknown as { data: Task | null; error: { message: string } | null }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ task: data })
}
