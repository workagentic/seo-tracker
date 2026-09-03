import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/auth'
import { TaskList } from '@/components/tasks/task-list'
import { TaskFilters } from '@/components/tasks/task-filters'
import { TaskFormDialog } from '@/components/tasks/task-form-dialog'
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
  // admin and senior both get the unscoped "All owners" view (CLAUDE.md Section 14) -- senior
  // is the near-admin tier for task management, not just an admin-tab visibility grant.
  const canManageAllTasks = profile.role === 'admin' || profile.role === 'senior'

  let query = supabase
    .from('tasks')
    .select(
      '*, owner_profile:owner_id(id, full_name, avatar_url), assigned_to_profile:assigned_to_id(id, full_name, avatar_url), category:category_id(id, name), linked_finding:linked_finding_id(id, title, status), linked_keyword:linked_keyword_id(id, keyword)'
    )
    .order('action_number', { ascending: true })

  // Everyone else always sees only their own tasks (Owner or Assigned To) -- no "All tasks"
  // toggle, and no way to view another owner's tasks (CLAUDE.md Section 14 Phase 3).
  if (canManageAllTasks) {
    if (params.owner) query = query.eq('owner_id', params.owner)
  } else {
    query = query.or(`owner_id.eq.${profile.id},assigned_to_id.eq.${profile.id}`)
  }
  if (params.quarter) query = query.eq('quarter', params.quarter)
  if (params.status) query = query.eq('status', params.status)
  if (params.category) query = query.eq('category_id', params.category)
  if (params.overdue === '1') {
    const today = new Date().toISOString().slice(0, 10)
    query = query.neq('status', 'completed').or(`due_date.lt.${today},next_due.lt.${today}`)
  }

  const { data: tasks } = await query
  const { data: owners } = await supabase.from('profiles').select('id, full_name').order('full_name')
  const { data: categories } = await supabase.from('task_categories').select('id, name').order('name')
  const { data: findings } = await supabase.from('audit_reports').select('id, title').order('title')
  const { data: keywords } = await supabase.from('tracked_keywords').select('id, keyword').eq('is_active', true).order('keyword')

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Task Tracker</h1>
        {canManageAllTasks && (
          <TaskFormDialog owners={owners ?? []} categories={categories ?? []} findings={findings ?? []} keywords={keywords ?? []} />
        )}
      </div>
      <TaskFilters owners={owners ?? []} categories={categories ?? []} isAdmin={canManageAllTasks} />
      <TaskList
        tasks={(tasks as Task[]) ?? []}
        currentProfile={profile}
        owners={owners ?? []}
        categories={categories ?? []}
        findings={findings ?? []}
        keywords={keywords ?? []}
      />
    </div>
  )
}
