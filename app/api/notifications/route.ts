import { NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getNotificationsForUser } from '@/lib/notifications'
import type { Task } from '@/types'

export async function GET() {
  const profile = await getCurrentProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('tasks')
    .select('*')
    .or(`assigned_to.eq.${profile.id},co_assigned_to.eq.${profile.id}`)

  const notifications = getNotificationsForUser((data as Task[]) ?? [], profile.id, new Date())
  return NextResponse.json({ notifications })
}
