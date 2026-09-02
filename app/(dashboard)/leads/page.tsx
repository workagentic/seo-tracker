import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/auth'
import { LeadsPageClient } from '@/components/leads/leads-page-client'
import { NewLeadDialog } from '@/components/leads/new-lead-dialog'
import type { Lead, LeadSource } from '@/types'

export default async function LeadsPage() {
  const profile = await getCurrentProfile()
  if (!profile || profile.role !== 'admin') redirect('/dashboard')

  const supabase = await createServerSupabaseClient()
  const { data: leads } = await supabase
    .from('leads')
    .select('*, source:source_id(id, name, requires_submission_from)')
    .order('created_at', { ascending: false })

  const { data: sources } = await supabase.from('lead_sources').select('*').order('name')

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Leads</h1>
        <NewLeadDialog sources={(sources as LeadSource[]) ?? []} />
      </div>
      <LeadsPageClient leads={(leads as Lead[]) ?? []} />
    </div>
  )
}
