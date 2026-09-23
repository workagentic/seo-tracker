import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { runGscSync } from '@/lib/gsc/sync'
import { runGscAuditSync } from '@/lib/gsc/auditSync'
import { runCompetitorSync } from '@/lib/ahrefs/competitorSync'
import { runGa4Sync } from '@/lib/ga4/sync'
import { runClaritySync } from '@/lib/clarity/sync'
import { generateAndSaveWeeklyReport } from '@/lib/weekly-report'
import { getQuarterlyTargets, resolveTarget } from '@/lib/targets'
import { getCurrentQuarter } from '@/lib/constants'

// Vercel Cron has no logged-in user, so this route authenticates via a shared secret
// (Vercel sends `Authorization: Bearer ${CRON_SECRET}` for jobs configured with a secret)
// instead of getCurrentProfile()'s session check that every other sync route uses.
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminSupabaseClient()

  const gsc = await runGscSync(admin, null)
  const gscAudit = await runGscAuditSync(admin, null)
  const competitors = await runCompetitorSync(admin, null)
  const ga4 = await runGa4Sync(admin, null)
  const clarity = await runClaritySync(admin, null)

  // Snapshot history is now recorded by runCompetitorSync itself (see its comment) so both
  // the manual "Sync competitors" button and this cron populate competitor_snapshots.
  const snapshotted =
    'results' in competitors.body ? competitors.body.results.filter((r) => r.status === 'success').length : 0

  const quarter = getCurrentQuarter(new Date())
  const allTargets = await getQuarterlyTargets(admin)
  const target = resolveTarget(allTargets, quarter)
  await generateAndSaveWeeklyReport(admin, target, null)

  const summary = `Weekly snapshot: GSC ${JSON.stringify(gsc.body)}; GSC audit issues ${JSON.stringify(
    gscAudit.body
  )}; competitors ${JSON.stringify(
    competitors.body
  )}; snapshotted ${snapshotted} competitor(s); GA4 ${JSON.stringify(ga4.body)}; Clarity ${JSON.stringify(clarity.body)}; weekly report generated`

  await admin.from('sync_logs').insert({
    source: 'weekly-cron',
    status:
      gsc.status === 200 && gscAudit.status === 200 && competitors.status === 200 && ga4.status === 200 && clarity.status === 200
        ? 'success'
        : 'error',
    message: summary,
    triggered_by: null,
  } as never)

  return NextResponse.json({
    gsc: gsc.body,
    gscAudit: gscAudit.body,
    competitors: competitors.body,
    snapshotted,
    ga4: ga4.body,
    clarity: clarity.body,
  })
}
