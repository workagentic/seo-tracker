import { NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/auth'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { computeTaskActivityEntries } from '@/lib/tasks/activity'
import { canEditTaskStatus, getAllowedStatuses } from '@/lib/tasks/permissions'
import { ELIGIBLE_OWNER_NAMES } from '@/lib/tasks/constants'
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

  const canEditAny = profile.role === 'admin' || profile.role === 'senior'
  // The task's current Owner or Assigned To (any profile, including reviewer -- see
  // lib/tasks/permissions.ts) can also change status/notes and hand the task on to someone
  // else, distinct from the admin/senior-only structural-fields gate below.
  const canEditAssignment = canEditAny || canEditTaskStatus(task, profile)
  if (!canEditAssignment) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const allowedFields: Record<string, unknown> = {}

  if (typeof body.status === 'string') {
    const nextStatus = body.status as TaskStatus
    if (!getAllowedStatuses(task, profile).includes(nextStatus)) {
      return NextResponse.json({ error: `Not allowed to set status to "${nextStatus}"` }, { status: 403 })
    }
    allowedFields.status = nextStatus
  }
  if (typeof body.notes === 'string') allowedFields.notes = body.notes

  // Reassignment: whoever currently holds the task (owner or assignee) can hand it to someone
  // else with a new deadline, same as admin/head -- this is the core handoff workflow
  // (CLAUDE.md Section 14 Phase 2), not an admin-only structural change.
  if (typeof body.assigned_to_id === 'string' || body.assigned_to_id === null) {
    allowedFields.assigned_to_id = body.assigned_to_id
  }
  if (typeof body.deadline === 'string' || body.deadline === null) {
    allowedFields.deadline = body.deadline
  }

  // Structural fields (everything beyond status/notes/assigned_to_id/deadline) are
  // admin/senior-only, distinct from the owner/assignee editing permission above.
  if (profile.role === 'admin' || profile.role === 'senior') {
    if (typeof body.action_number === 'string' || body.action_number === null) allowedFields.action_number = body.action_number
    if (typeof body.title === 'string') allowedFields.title = body.title
    if (typeof body.description === 'string' || body.description === null) allowedFields.description = body.description
    if (typeof body.position_responsible === 'string' || body.position_responsible === null) {
      allowedFields.position_responsible = body.position_responsible
    }
    if (typeof body.due_date === 'string' || body.due_date === null) allowedFields.due_date = body.due_date
    if (typeof body.quarter === 'string' || body.quarter === null) allowedFields.quarter = body.quarter
    if (typeof body.category_id === 'string' || body.category_id === null) allowedFields.category_id = body.category_id
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
    body.action_number !== undefined || body.title !== undefined ||
    body.due_date !== undefined || body.quarter !== undefined || body.description !== undefined ||
    body.position_responsible !== undefined || body.category_id !== undefined || body.link_url !== undefined ||
    body.repeats !== undefined || body.next_due !== undefined || body.linked_finding_id !== undefined ||
    body.linked_keyword_id !== undefined
  ) {
    return NextResponse.json({ error: 'Only admin/senior can edit task details beyond status/notes/assignment' }, { status: 403 })
  }

  // Owner is admin-only to change once a task exists -- senior is fixed as Owner only at
  // creation time (POST /api/tasks), editing an existing task's Owner stays admin-only
  // (CLAUDE.md Section 14 follow-up, 3 Sep 2026).
  if (typeof body.owner_id === 'string' || body.owner_id === null) {
    if (profile.role !== 'admin') {
      return NextResponse.json({ error: "Only admin can change a task's Owner" }, { status: 403 })
    }
    if (body.owner_id !== null) {
      const { data: eligible } = await admin.from('profiles').select('id').in('full_name', ELIGIBLE_OWNER_NAMES)
      const eligibleIds = new Set(((eligible as { id: string }[]) ?? []).map((p) => p.id))
      if (!eligibleIds.has(body.owner_id)) {
        return NextResponse.json({ error: 'owner_id must be one of the 3 eligible owners' }, { status: 400 })
      }
    }
    allowedFields.owner_id = body.owner_id
  }

  // Validate deadline <= due_date using whichever of the two is being set in this request,
  // falling back to the task's existing value for whichever one isn't.
  const finalDueDate = 'due_date' in allowedFields ? allowedFields.due_date : task.due_date
  const finalDeadline = 'deadline' in allowedFields ? allowedFields.deadline : task.deadline
  if (finalDeadline && finalDueDate && (finalDeadline as string) > (finalDueDate as string)) {
    return NextResponse.json({ error: 'Deadline cannot be later than the Due date' }, { status: 400 })
  }

  const activityEntries = computeTaskActivityEntries(task as unknown as Record<string, unknown>, allowedFields)

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

  // Completing a task linked to an Audit finding offers to resolve that finding in the same
  // step, catching the exact "task done, finding still open" mismatch the linking feature
  // exists to prevent. Opt-in via resolve_linked_finding -- the client only sends it when the
  // task actually has a linked_finding_id.
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
  if (!profile || !['admin', 'senior'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const admin = createAdminSupabaseClient()
  const { error } = await admin.from('tasks').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
