import type { SupabaseClient } from '@supabase/supabase-js'
import { getAppSettings } from '@/lib/settings'
import { fetchUrlInspection, fetchSitemapIssues, GSC_INSPECTION_DELAY_MS } from '@/lib/gsc/issues'
import { classifyCoverageState, classifySitemapIssue } from '@/lib/gsc/issue-classifier'
import { fetchPageSpeed } from '@/lib/pagespeed/client'
import { classifyPageSpeed } from '@/lib/pagespeed/issue-classifier'
import type { AuditSeverity, AuditSource, TrackedKeyword } from '@/types'

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export interface GscAuditSyncResult {
  status: number
  body:
    | { checked: number; gscIssues: number; speedIssues: number; resolved: number; summary: string }
    | { error: string }
}

interface UpsertFindingInput {
  source: AuditSource
  sourceKey: string
  hasIssue: boolean
  severity: AuditSeverity | null
  title: string
  finding: string
  recommendation: string
}

// Finds the existing auto-generated finding for this (source, source_key), if any, and
// inserts/updates/resolves it -- never duplicates. Returns 'created' | 'updated' | 'resolved'
// | 'unchanged' for the caller's summary counts.
async function upsertFinding(
  admin: SupabaseClient,
  input: UpsertFindingInput
): Promise<'created' | 'updated' | 'resolved' | 'unchanged'> {
  const { data: existing } = await admin
    .from('audit_reports')
    .select('id, status')
    .eq('source', input.source)
    .eq('source_key', input.sourceKey)
    .maybeSingle()

  const existingRow = existing as { id: string; status: string } | null

  if (!input.hasIssue) {
    if (existingRow && existingRow.status !== 'resolved') {
      await admin
        .from('audit_reports')
        .update({ status: 'resolved', resolved_at: new Date().toISOString() } as never)
        .eq('id', existingRow.id)
      return 'resolved'
    }
    return 'unchanged'
  }

  if (existingRow) {
    await admin
      .from('audit_reports')
      .update({
        title: input.title,
        severity: input.severity,
        finding: input.finding,
        recommendation: input.recommendation,
        status: existingRow.status === 'resolved' ? 'open' : existingRow.status,
      } as never)
      .eq('id', existingRow.id)
    return 'updated'
  }

  await admin.from('audit_reports').insert({
    title: input.title,
    category: 'technical',
    severity: input.severity,
    finding: input.finding,
    recommendation: input.recommendation,
    source: input.source,
    source_key: input.sourceKey,
    status: 'open',
  } as never)
  return 'created'
}

// DB-integration orchestration, called by both app/api/audit/gsc-sync/route.ts and the weekly
// cron -- same shape as lib/gsc/sync.ts's runGscSync / lib/ahrefs/competitorSync.ts's
// runCompetitorSync. See docs/superpowers/specs/2026-09-23-gsc-audit-issues-design.md.
export async function runGscAuditSync(admin: SupabaseClient, triggeredBy: string | null): Promise<GscAuditSyncResult> {
  const settings = await getAppSettings(admin)
  if (!settings.gsc_site_url) {
    const message = 'GSC site URL is not configured — set it via /admin/settings'
    await admin.from('sync_logs').insert({ source: 'gsc-issues', status: 'error', message, triggered_by: triggeredBy } as never)
    return { status: 502, body: { error: message } }
  }
  const siteUrl = settings.gsc_site_url

  const { data: keywords } = await admin.from('tracked_keywords').select('target_url').eq('is_active', true)
  const urls = Array.from(
    new Set(((keywords as Pick<TrackedKeyword, 'target_url'>[]) ?? []).map((k) => k.target_url).filter((u): u is string => !!u))
  )

  let checked = 0
  let gscIssues = 0
  let speedIssues = 0
  let resolved = 0

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i]
    checked++

    try {
      const inspection = await fetchUrlInspection(siteUrl, url)
      const classification = classifyCoverageState(inspection.coverageState, inspection.verdict)
      const outcome = await upsertFinding(admin, {
        source: 'gsc',
        sourceKey: url,
        hasIssue: classification.hasIssue,
        severity: classification.severity,
        title: `GSC indexing issue — ${url}`,
        finding: `${classification.summary} (${url})`,
        recommendation: 'Review this URL in Google Search Console\'s URL Inspection tool for the exact cause.',
      })
      if (outcome === 'created' || outcome === 'updated') gscIssues++
      if (outcome === 'resolved') resolved++
    } catch {
      // A single URL's GSC check failing never aborts the batch.
    }

    try {
      const speed = await fetchPageSpeed(url)
      if (speed) {
        const classification = classifyPageSpeed(speed)
        const outcome = await upsertFinding(admin, {
          source: 'pagespeed',
          sourceKey: url,
          hasIssue: classification.hasIssue,
          severity: classification.severity,
          title: `Page speed issue — ${url}`,
          finding: `${classification.summary} (${url})`,
          recommendation: 'Run this URL through PageSpeed Insights for detailed optimisation suggestions.',
        })
        if (outcome === 'created' || outcome === 'updated') speedIssues++
        if (outcome === 'resolved') resolved++
      }
    } catch {
      // A single URL's PageSpeed check failing never aborts the batch.
    }

    if (i < urls.length - 1) await sleep(GSC_INSPECTION_DELAY_MS)
  }

  try {
    const sitemaps = await fetchSitemapIssues(siteUrl)
    for (const sitemap of sitemaps) {
      const classification = classifySitemapIssue(sitemap.errors, sitemap.warnings)
      const outcome = await upsertFinding(admin, {
        source: 'gsc',
        sourceKey: sitemap.path,
        hasIssue: classification.hasIssue,
        severity: classification.severity,
        title: `GSC sitemap issue — ${sitemap.path}`,
        finding: `${classification.summary} for this sitemap`,
        recommendation: 'Review this sitemap in Google Search Console for the specific errors/warnings.',
      })
      if (outcome === 'created' || outcome === 'updated') gscIssues++
      if (outcome === 'resolved') resolved++
    }
  } catch {
    // Sitemap fetch failing doesn't block the URL-inspection/PageSpeed results above.
  }

  const summary = `Checked ${checked} URL(s): ${gscIssues} GSC issue(s), ${speedIssues} speed issue(s) found/updated, ${resolved} resolved`

  await admin.from('sync_logs').insert({
    source: 'gsc-issues',
    status: 'success',
    message: summary,
    triggered_by: triggeredBy,
  } as never)

  return { status: 200, body: { checked, gscIssues, speedIssues, resolved, summary } }
}
