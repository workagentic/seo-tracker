import { createServerSupabaseClient } from '@/lib/supabase/server'
import { LeadSourceForm } from '@/components/admin/lead-source-form'
import { LeadSourceRow } from '@/components/admin/lead-source-row'
import type { LeadSourceWithOptions } from '@/types'

export default async function AdminLeadSourcesPage() {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('lead_sources')
    .select('*, submission_options:lead_source_submission_options(id, source_id, label, is_active, created_at)')
    .order('name')

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-foreground">Lead Sources</h1>
      <LeadSourceForm />
      <div className="overflow-x-auto rounded-md border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs font-medium uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Requires Submission From</th>
              <th className="px-4 py-2">Active</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {((data as LeadSourceWithOptions[]) ?? []).map((s) => (
              <LeadSourceRow key={s.id} source={s} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
