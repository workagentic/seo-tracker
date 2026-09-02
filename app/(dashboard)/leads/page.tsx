import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/auth'
import { NewLeadDialog } from '@/components/leads/new-lead-dialog'
import { LeadsFilters } from '@/components/leads/leads-filters'
import { LeadsPageClient } from '@/components/leads/leads-page-client'
import type { Lead, LeadSource } from '@/types'

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const profile = await getCurrentProfile()
  if (!profile || profile.role !== 'admin') redirect('/dashboard')

  const params = await searchParams
  const supabase = await createServerSupabaseClient()

  let query = supabase
    .from('leads')
    .select('*, source:source_id(id, name, requires_submission_from)')
    .order('created_at', { ascending: false })

  if (params.from) query = query.gte('lead_date', params.from)
  if (params.to) query = query.lte('lead_date', params.to)
  if (params.brand) query = query.eq('brand', params.brand)
  if (params.source) query = query.eq('source_id', params.source)

  const { data: leads } = await query
  const { data: sources } = await supabase.from('lead_sources').select('*').order('name')

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Leads</h1>
        <NewLeadDialog sources={(sources as LeadSource[]) ?? []} />
      </div>
      <LeadsFilters sources={(sources as LeadSource[]) ?? []} />
      <LeadsPageClient leads={(leads as Lead[]) ?? []} sources={(sources as LeadSource[]) ?? []} />
    </div>
  )
}
