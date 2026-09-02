import { NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getNotificationsForUser, RECENTLY_CHANGED_HOURS } from '@/lib/notifications'
import type { Task, TaskComment } from '@/types'

// Personal, low-privilege data -- uses the caller's own session client (RLS-scoped to
// auth.uid(), migration 0020), not the service-role admin client used for cross-user writes
// elsewhere in the app.
export async function POST(request: Request) {
  const profile = await getCurrentProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createServerSupabaseClient()
  const body = await request.json()

  if (body.all === true) {
    const now = new Date()
    const { data: tasks } = await supabase
      .from('tasks')
      .select('*')
      .or(`assigned_to.eq.${profile.id},co_assigned_to.eq.${profile.id},approver_id.eq.${profile.id}`)
    const taskIds = ((tasks as Task[]) ?? []).map((t) => t.id)
    const recentCutoff = new Date(now.getTime() - RECENTLY_CHANGED_HOURS * 60 * 60 * 1000).toISOString()
    const { data: comments } = taskIds.length
      ? await supabase.from('task_comments').select('*').in('task_id', taskIds).gte('created_at', recentCutoff)
      : { data: [] }
    const notifications = getNotificationsForUser((tasks as Task[]) ?? [], (comments as TaskComment[]) ?? [], profile.id, now)

    if (notifications.length > 0) {
      await supabase.from('notification_reads').upsert(
        notifications.map((n) => ({ user_id: profile.id, notification_key: n.key })) as never,
        { onConflict: 'user_id,notification_key' }
      )
    }
    return NextResponse.json({ ok: true, marked: notifications.length })
  }

  if (typeof body.key !== 'string' || typeof body.read !== 'boolean') {
    return NextResponse.json({ error: 'key and read are required' }, { status: 400 })
  }

  if (body.read) {
    const { error } = await supabase
      .from('notification_reads')
      .upsert({ user_id: profile.id, notification_key: body.key } as never, { onConflict: 'user_id,notification_key' })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    const { error } = await supabase
      .from('notification_reads')
      .delete()
      .eq('user_id', profile.id)
      .eq('notification_key', body.key)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
