import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/auth'
import { AuditCard } from '@/components/audit/audit-card'
import { AuditFilters } from '@/components/audit/audit-filters'
import { NewFindingDialog } from '@/components/audit/new-finding-dialog'
import type { AuditReport } from '@/types'

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const profile = await getCurrentProfile()
  const params = await searchParams
  const supabase = await createServerSupabaseClient()

  let query = supabase
    .from('audit_reports')
    .select('*, assigned_profile:assigned_to(id, full_name)')
    .order('severity', { ascending: true })

  if (params.category) query = query.eq('category', params.category)
  if (params.severity) query = query.eq('severity', params.severity)
  if (params.status) query = query.eq('status', params.status)

  const { data } = await query
  const reports = (data as AuditReport[]) ?? []

  const { data: linkedTasks } = reports.length
    ? await supabase
        .from('tasks')
        .select('id, action_number, title, status, linked_finding_id')
        .in(
          'linked_finding_id',
          reports.map((r) => r.id)
        )
    : { data: [] }

  const tasksByFinding = new Map<string, { id: string; action_number: string | null; title: string; status: string }[]>()
  for (const t of (linkedTasks ?? []) as { id: string; action_number: string | null; title: string; status: string; linked_finding_id: string }[]) {
    const list = tasksByFinding.get(t.linked_finding_id) ?? []
    list.push({ id: t.id, action_number: t.action_number, title: t.title, status: t.status })
    tasksByFinding.set(t.linked_finding_id, list)
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Audit Reports</h1>
        {profile && ['admin', 'senior'].includes(profile.role) && <NewFindingDialog />}
      </div>
      <AuditFilters />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {reports.map((report) => (
          <AuditCard key={report.id} report={report} linkedTasks={tasksByFinding.get(report.id) ?? []} />
        ))}
      </div>
    </div>
  )
}
