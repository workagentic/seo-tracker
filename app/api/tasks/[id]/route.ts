import { NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/auth'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { computeTaskActivityEntries } from '@/lib/tasks/activity'
import { canEditTaskStatus, getAllowedStatuses } from '@/lib/tasks/permissions'
import type { Task, TaskStatus } from '@/types'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const profile = await getCurrentProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminSupabaseClient()
  const { data: task } = (await admin.from('tasks').select('*').eq('id', id).single()) as unknown as {
    data: Task | null
  }
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const canEditAny = profile.role === 'admin' || profile.role === 'head'
  if (!canEditAny && !canEditTaskStatus(task, profile)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const allowedFields: Record<string, unknown> = {}

  if (typeof body.status === 'string') {
    const nextStatus = body.status as TaskStatus
    if (!getAllowedStatuses(task, profile).includes(nextStatus)) {
      return NextResponse.json({ error: `Not allowed to set status to "${nextStatus}"` }, { status: 403 })
    }
    if (nextStatus === 'changes_requested' && !body.change_reason?.trim()) {
      return NextResponse.json({ error: 'A reason is required to request changes' }, { status: 400 })
    }
    allowedFields.status = nextStatus
  }
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
    if (typeof body.approver_id === 'string' || body.approver_id === null) allowedFields.approver_id = body.approver_id
    if (typeof body.due_date === 'string' || body.due_date === null) allowedFields.due_date = body.due_date
    if (typeof body.quarter === 'string' || body.quarter === null) allowedFields.quarter = body.quarter
    if (typeof body.category === 'string' || body.category === null) allowedFields.category = body.category
    if (typeof body.link_url === 'string' || body.link_url === null) allowedFields.link_url = body.link_url
    if (typeof body.repeats === 'string' || body.repeats === null) allowedFields.repeats = body.repeats
    if (typeof body.next_due === 'string' || body.next_due === null) allowedFields.next_due = body.next_due
    if (typeof body.linked_finding_id === 'string' || body.linked_finding_id === null) {
      allowedFields.linked_finding_id = body.linked_finding_id
    }
    if (typeof body.linked_keyword_id === 'string' || body.linked_keyword_id === null) {
      allowedFields.linked_keyword_id = body.linked_keyword_id
    }
  } else if (
    body.action_number !== undefined || body.title !== undefined || body.assigned_to !== undefined ||
    body.co_assigned_to !== undefined || body.approver_id !== undefined || body.due_date !== undefined ||
    body.quarter !== undefined || body.description !== undefined || body.position_responsible !== undefined ||
    body.category !== undefined || body.link_url !== undefined || body.repeats !== undefined ||
    body.next_due !== undefined || body.linked_finding_id !== undefined || body.linked_keyword_id !== undefined
  ) {
    return NextResponse.json({ error: 'Only admins can edit task details beyond status/notes' }, { status: 403 })
  }

  const activityEntries = computeTaskActivityEntries(task as unknown as Record<string, unknown>, allowedFields)
  if (allowedFields.status === 'changes_requested') {
    activityEntries.push({ field: 'change_request_reason', old_value: null, new_value: String(body.change_reason).trim() })
  }

  if (allowedFields.status === 'completed') allowedFields.completed_at = new Date().toISOString()
  allowedFields.updated_at = new Date().toISOString()
  allowedFields.updated_by = profile.id

  const result = await admin.from('tasks').update(allowedFields as never).eq('id', id).select().single()
  const { data, error } = result as unknown as { data: Task | null; error: { message: string } | null }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (activityEntries.length > 0) {
    await admin.from('task_activity').insert(
      activityEntries.map((entry) => ({
        task_id: id,
        changed_by: profile.id,
        field: entry.field,
        old_value: entry.old_value,
        new_value: entry.new_value,
      })) as never
    )
  }

  // Approval-workflow mockup: completing a task linked to an Audit finding offers to resolve
  // that finding in the same step, catching the exact "task done, finding still open"
  // mismatch the linking feature exists to prevent. Opt-in via resolve_linked_finding -- the
  // client only sends it when the task actually has a linked_finding_id.
  if (allowedFields.status === 'completed' && task.linked_finding_id && body.resolve_linked_finding === true) {
    await admin
      .from('audit_reports')
      .update({ status: 'resolved', resolved_at: new Date().toISOString() } as never)
      .eq('id', task.linked_finding_id)
  }

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
