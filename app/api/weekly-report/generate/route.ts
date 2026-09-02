import { NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/auth'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { generateAndSaveWeeklyReport } from '@/lib/weekly-report'
import { getQuarterlyTargets, resolveTarget } from '@/lib/targets'
import { getCurrentQuarter } from '@/lib/constants'

export async function POST() {
  const profile = await getCurrentProfile()
  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = createAdminSupabaseClient()
  const quarter = getCurrentQuarter(new Date())
  const allTargets = await getQuarterlyTargets(admin)
  const target = resolveTarget(allTargets, quarter)

  const summary = await generateAndSaveWeeklyReport(admin, target, profile.id)
  return NextResponse.json({ summary })
}
