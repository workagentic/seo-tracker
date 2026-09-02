import { NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getNotificationsForUser, RECENTLY_CHANGED_HOURS } from '@/lib/notifications'
import type { Task, TaskComment } from '@/types'

export async function GET() {
  const profile = await getCurrentProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = new Date()
  const supabase = await createServerSupabaseClient()
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

  const { data: reads } = notifications.length
    ? await supabase
        .from('notification_reads')
        .select('notification_key')
        .eq('user_id', profile.id)
        .in(
          'notification_key',
          notifications.map((n) => n.key)
        )
    : { data: [] }
  const readKeys = new Set(((reads ?? []) as { notification_key: string }[]).map((r) => r.notification_key))

  return NextResponse.json({
    notifications: notifications.map((n) => ({ ...n, read: readKeys.has(n.key) })),
  })
}
