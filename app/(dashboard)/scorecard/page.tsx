import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/auth'
import { getAllSnapshots } from '@/lib/metrics'
import { getQuarterlyTargets } from '@/lib/targets'
import { getAccountabilityMap } from '@/lib/accountability'
import { canSyncScorecardActuals } from '@/lib/scorecard'
import { ScorecardTable } from '@/components/scorecard/scorecard-table'
import { QuarterSelector } from '@/components/scorecard/quarter-selector'
import { ExportButtons } from '@/components/scorecard/export-buttons'
import { SyncButton } from '@/components/dashboard/sync-button'

export default async function ScorecardPage({
  searchParams,
}: {
  searchParams: Promise<{ quarter?: string }>
}) {
  const { quarter } = await searchParams
  const profile = await getCurrentProfile()
  const supabase = await createServerSupabaseClient()
  const [snapshots, targets, accountabilityMap] = await Promise.all([
    getAllSnapshots(supabase),
    getQuarterlyTargets(supabase),
    getAccountabilityMap(supabase),
  ])

  const selected = quarter && quarter in targets ? quarter : 'baseline'
  // getAllSnapshots is ordered oldest -> newest, so the last match for a quarter is the latest one.
  const matches = snapshots.filter((s) => s.quarter_label === (selected === 'baseline' ? 'Baseline' : selected))
  const snapshot = matches.length > 0 ? matches[matches.length - 1] : null
  const target = targets[selected]

  const canExport = profile && ['admin', 'senior'].includes(profile.role)
  const canSync = profile && canSyncScorecardActuals(profile)

  return (
    <div>
      <div className="mb-4 flex items-center justify-between print:hidden">
        <h1 className="text-xl font-semibold text-foreground">Quarterly Scorecard</h1>
        <div className="flex items-center gap-3">
          {canSync && <SyncButton endpoint="/api/scorecard/sync-actuals" label="Sync Actuals" />}
          {profile?.role === 'admin' && (
            <Link href="/scorecard/edit" className="text-sm font-medium text-primary hover:underline">
              Edit Targets
            </Link>
          )}
          <QuarterSelector current={selected} targets={targets} />
        </div>
      </div>
      <h1 className="mb-4 hidden text-xl font-semibold text-foreground print:block">
        Quarterly Scorecard — {target.label}
      </h1>
      {canExport && (
        <div className="mb-4 flex justify-end">
          <ExportButtons snapshot={snapshot} target={target} quarterLabel={target.label} accountabilityMap={accountabilityMap} />
        </div>
      )}
      <ScorecardTable snapshot={snapshot} target={target} accountabilityMap={accountabilityMap} />
    </div>
  )
}
