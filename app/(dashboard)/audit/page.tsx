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

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Audit Reports</h1>
        {profile && ['admin', 'head'].includes(profile.role) && <NewFindingDialog />}
      </div>
      <AuditFilters />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {((data as AuditReport[]) ?? []).map((report) => <AuditCard key={report.id} report={report} />)}
      </div>
    </div>
  )
}
