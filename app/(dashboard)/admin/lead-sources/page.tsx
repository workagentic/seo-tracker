import { createServerSupabaseClient } from '@/lib/supabase/server'
import { LeadSourceForm } from '@/components/admin/lead-source-form'
import { LeadSourceToggle } from '@/components/admin/lead-source-toggle'
import type { LeadSource } from '@/types'

export default async function AdminLeadSourcesPage() {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase.from('lead_sources').select('*').order('name')

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
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {((data as LeadSource[]) ?? []).map((s) => (
              <tr key={s.id} className="hover:bg-muted/50">
                <td className="px-4 py-2 text-foreground">{s.name}</td>
                <td className="px-4 py-2">
                  <LeadSourceToggle id={s.id} field="requires_submission_from" value={s.requires_submission_from} />
                </td>
                <td className="px-4 py-2">
                  <LeadSourceToggle id={s.id} field="is_active" value={s.is_active} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
