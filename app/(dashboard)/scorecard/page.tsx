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
  const snapshot = snapshots.find((s) => s.quarter_label === (selected === 'baseline' ? 'Baseline' : selected)) ?? null
  const target = QUARTERLY_TARGETS[selected]

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Quarterly Scorecard</h1>
        <QuarterSelector current={selected} />
      </div>
      <ScorecardTable snapshot={snapshot} target={target} />
    </div>
  )
}
