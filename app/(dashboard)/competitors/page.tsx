import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/auth'
import { CompetitorTable } from '@/components/competitors/competitor-table'
import { AddCompetitorDialog } from '@/components/competitors/add-competitor-dialog'
import { SyncCompetitorsButton } from '@/components/competitors/sync-competitors-button'
import type { Competitor } from '@/types'

export default async function CompetitorsPage() {
  const profile = await getCurrentProfile()
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase.from('competitors').select('*').eq('is_active', true).order('domain_rating', { ascending: false, nullsFirst: false })
  const canSync = profile && ['admin', 'head'].includes(profile.role)

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Competitor Tracker</h1>
        <div className="flex gap-2">
          {canSync && <SyncCompetitorsButton />}
          {profile?.role === 'admin' && <AddCompetitorDialog />}
        </div>
      </div>
      <CompetitorTable competitors={(data as Competitor[]) ?? []} isAdmin={profile?.role === 'admin'} />
    </div>
  )
}
