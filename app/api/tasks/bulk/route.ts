import { NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/auth'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { computeTaskActivityEntries } from '@/lib/tasks/activity'
import { getAllowedStatuses } from '@/lib/tasks/permissions'
import type { Task, TaskStatus } from '@/types'

// Bulk toolbar (Staff Docs/further_recs_mockup.html #4). Two actions: admin/senior-only
// reassign (sets assigned_to_id -- the hands-on-work field, not Owner, which stays restricted
// to the 3 eligible people and isn't a bulk-reassignable field), and a "set status to" that reuses the
// same per-row permission logic as the single-task PATCH route (app/api/tasks/[id]/route.ts)
// -- rows the caller isn't allowed to touch are skipped, not errored, so one forbidden row
// doesn't block the rest of the batch.
export async function POST(request: Request) {
  const profile = await getCurrentProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const ids: string[] = Array.isArray(body.ids) ? body.ids : []
  if (ids.length === 0) return NextResponse.json({ error: 'ids is required' }, { status: 400 })

  const admin = createAdminSupabaseClient()

  if (body.action === 'reassign') {
    if (!['admin', 'senior'].includes(profile.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (typeof body.assigned_to_id !== 'string') {
      return NextResponse.json({ error: 'assigned_to_id is required' }, { status: 400 })
    }
    const { data, error } = await admin
      .from('tasks')
      .update({ assigned_to_id: body.assigned_to_id, updated_at: new Date().toISOString(), updated_by: profile.id } as never)
      .in('id', ids)
      .select('id')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ updated: data?.length ?? 0, skipped: ids.length - (data?.length ?? 0) })
  }

  if (body.action === 'set_status') {
    const nextStatus = body.status as TaskStatus
    if (!nextStatus) {
      return NextResponse.json({ error: 'A valid status is required' }, { status: 400 })
    }

    const { data: tasksData } = (await admin.from('tasks').select('*').in('id', ids)) as unknown as { data: Task[] | null }
    const tasks = tasksData ?? []

    let updated = 0
    for (const task of tasks) {
      if (!getAllowedStatuses(task, profile).includes(nextStatus)) continue

      const update: Record<string, unknown> = {
        status: nextStatus,
        updated_at: new Date().toISOString(),
        updated_by: profile.id,
      }
      if (nextStatus === 'completed') update.completed_at = new Date().toISOString()

      const activityEntries = computeTaskActivityEntries(task as unknown as Record<string, unknown>, update)
      const { error } = await admin.from('tasks').update(update as never).eq('id', task.id)
      if (error) continue
      updated += 1

      if (activityEntries.length > 0) {
        await admin.from('task_activity').insert(
          activityEntries.map((entry) => ({
            task_id: task.id,
            changed_by: profile.id,
            field: entry.field,
            old_value: entry.old_value,
            new_value: entry.new_value,
          })) as never
        )
      }
    }
    return NextResponse.json({ updated, skipped: ids.length - updated })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
