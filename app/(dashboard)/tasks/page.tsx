import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/auth'
import { TaskList } from '@/components/tasks/task-list'
import { TaskFilters } from '@/components/tasks/task-filters'
import { TaskFormDialog } from '@/components/tasks/task-form-dialog'
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
    .select(
      '*, assigned_profile:assigned_to(id, full_name, avatar_url), co_assigned_profile:co_assigned_to(id, full_name, avatar_url), approver_profile:approver_id(id, full_name, avatar_url), linked_finding:linked_finding_id(id, title, status), linked_keyword:linked_keyword_id(id, keyword)'
    )
    .order('action_number', { ascending: true })

  if (params.mine === '1') query = query.or(`assigned_to.eq.${profile.id},co_assigned_to.eq.${profile.id}`)
  if (params.quarter) query = query.eq('quarter', params.quarter)
  if (params.status) query = query.eq('status', params.status)
  if (params.owner) query = query.eq('assigned_to', params.owner)
  if (params.overdue === '1') {
    const today = new Date().toISOString().slice(0, 10)
    query = query.neq('status', 'completed').or(`due_date.lt.${today},next_due.lt.${today}`)
  }

  const { data: tasks } = await query
  const { data: owners } = await supabase.from('profiles').select('id, full_name').order('full_name')
  const { data: findings } = await supabase.from('audit_reports').select('id, title').order('title')
  const { data: keywords } = await supabase.from('tracked_keywords').select('id, keyword').eq('is_active', true).order('keyword')

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Task Tracker</h1>
        {profile.role === 'admin' && (
          <TaskFormDialog owners={owners ?? []} findings={findings ?? []} keywords={keywords ?? []} />
        )}
      </div>
      <Q1Banner />
      <TaskFilters owners={owners ?? []} />
      <TaskList
        tasks={(tasks as Task[]) ?? []}
        currentProfile={profile}
        owners={owners ?? []}
        findings={findings ?? []}
        keywords={keywords ?? []}
      />
    </div>
  )
}
