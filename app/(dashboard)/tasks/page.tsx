import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/auth'
import { TaskList } from '@/components/tasks/task-list'
import { TaskFilters } from '@/components/tasks/task-filters'
import { Q1Banner } from '@/components/tasks/q1-banner'
import type { Task } from '@/types'

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')

  const params = await searchParams
  const supabase = await createServerSupabaseClient()

  let query = supabase
    .from('tasks')
    .select('*, assigned_profile:assigned_to(id, full_name, avatar_url), co_assigned_profile:co_assigned_to(id, full_name, avatar_url)')
    .order('action_number', { ascending: true })

  if (params.mine === '1') query = query.or(`assigned_to.eq.${profile.id},co_assigned_to.eq.${profile.id}`)
  if (params.quarter) query = query.eq('quarter', params.quarter)
  if (params.status) query = query.eq('status', params.status)
  if (params.owner) query = query.eq('assigned_to', params.owner)
  if (params.overdue === '1') query = query.lt('due_date', new Date().toISOString().slice(0, 10)).neq('status', 'completed')

  const { data: tasks } = await query
  const { data: owners } = await supabase.from('profiles').select('id, full_name').order('full_name')

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-foreground">Task Tracker</h1>
      <Q1Banner />
      <TaskFilters owners={owners ?? []} />
      <TaskList tasks={(tasks as Task[]) ?? []} currentProfile={profile} />
    </div>
  )
}
