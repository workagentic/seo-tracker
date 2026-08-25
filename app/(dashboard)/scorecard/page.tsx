import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getAllSnapshots } from '@/lib/metrics'
import { QUARTERLY_TARGETS } from '@/lib/constants'
import { ScorecardTable } from '@/components/scorecard/scorecard-table'
import { QuarterSelector } from '@/components/scorecard/quarter-selector'

export default async function ScorecardPage({
  searchParams,
}: {
  searchParams: Promise<{ quarter?: string }>
}) {
  const { quarter } = await searchParams
  const supabase = await createServerSupabaseClient()
  const snapshots = await getAllSnapshots(supabase)

  const selected = (quarter && quarter in QUARTERLY_TARGETS ? quarter : 'baseline') as keyof typeof QUARTERLY_TARGETS
  // getAllSnapshots is ordered oldest -> newest, so the last match for a quarter is the latest one.
  const matches = snapshots.filter((s) => s.quarter_label === (selected === 'baseline' ? 'Baseline' : selected))
  const snapshot = matches.length > 0 ? matches[matches.length - 1] : null
  const target = QUARTERLY_TARGETS[selected]

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Quarterly Scorecard</h1>
        <QuarterSelector current={selected} />
      </div>
      <ScorecardTable snapshot={snapshot} target={target} />
    </div>
  )
}
