import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/auth'
import { getAllSnapshots } from '@/lib/metrics'
import { getQuarterlyTargets } from '@/lib/targets'
import { ScorecardTable } from '@/components/scorecard/scorecard-table'
import { QuarterSelector } from '@/components/scorecard/quarter-selector'

export default async function ScorecardPage({
  searchParams,
}: {
  searchParams: Promise<{ quarter?: string }>
}) {
  const { quarter } = await searchParams
  const profile = await getCurrentProfile()
  const supabase = await createServerSupabaseClient()
  const [snapshots, targets] = await Promise.all([getAllSnapshots(supabase), getQuarterlyTargets(supabase)])

  const selected = quarter && quarter in targets ? quarter : 'baseline'
  // getAllSnapshots is ordered oldest -> newest, so the last match for a quarter is the latest one.
  const matches = snapshots.filter((s) => s.quarter_label === (selected === 'baseline' ? 'Baseline' : selected))
  const snapshot = matches.length > 0 ? matches[matches.length - 1] : null
  const target = targets[selected]

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Quarterly Scorecard</h1>
        <div className="flex items-center gap-3">
          {profile?.role === 'admin' && (
            <Link href="/scorecard/edit" className="text-sm font-medium text-primary hover:underline">
              Edit Targets
            </Link>
          )}
          <QuarterSelector current={selected} />
        </div>
      </div>
      <ScorecardTable snapshot={snapshot} target={target} />
    </div>
  )
}
