import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/auth'
import { getQuarterlyTargets } from '@/lib/targets'
import { getAccountabilityMap } from '@/lib/accountability'
import { TargetsEditor } from '@/components/scorecard/targets-editor'
import { AccountabilityEditor } from '@/components/scorecard/accountability-editor'

export default async function EditTargetsPage() {
  const profile = await getCurrentProfile()
  if (!profile || profile.role !== 'admin') redirect('/scorecard')

  const supabase = await createServerSupabaseClient()
  const [targets, accountabilityMap] = await Promise.all([
    getQuarterlyTargets(supabase),
    getAccountabilityMap(supabase),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-4 text-xl font-semibold text-foreground">Edit Quarterly Targets</h1>
        <p className="mb-4 text-sm text-muted-foreground">
          These are the target values shown on the Dashboard and Scorecard. Actual values are
          entered separately via Admin → Metrics (or synced from Ahrefs/GSC).
        </p>
        <TargetsEditor targets={targets} />
      </div>
      <AccountabilityEditor accountabilityMap={accountabilityMap} />
    </div>
  )
}
