import { NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getNotificationsForUser, RECENTLY_CHANGED_HOURS } from '@/lib/notifications'
import type { Task, TaskActivity, TaskComment } from '@/types'

export async function GET() {
  const profile = await getCurrentProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = new Date()
  const supabase = await createServerSupabaseClient()
  // Fetches ALL tasks/recent comments/recent activity, not just this user's own -- a mention
  // can happen on any task (Section 14 Phase 3's "mentioned" notification is independent of
  // task attachment), and getNotificationsForUser already does its own owner_id/assigned_to_id
  // filtering for the notification types that ARE scoped to the user's own tasks.
  const recentCutoff = new Date(now.getTime() - RECENTLY_CHANGED_HOURS * 60 * 60 * 1000).toISOString()
  const [{ data: tasks }, { data: comments }, { data: activity }] = await Promise.all([
    supabase.from('tasks').select('*'),
    supabase.from('task_comments').select('*').gte('created_at', recentCutoff),
    supabase.from('task_activity').select('*').gte('created_at', recentCutoff),
  ])

  const notifications = getNotificationsForUser(
    (tasks as Task[]) ?? [],
    (comments as TaskComment[]) ?? [],
    (activity as TaskActivity[]) ?? [],
    profile.id,
    now,
    profile.full_name
  )

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
