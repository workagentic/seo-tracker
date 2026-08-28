import type { SupabaseClient } from '@supabase/supabase-js'
import { getAppSettings } from '@/lib/settings'
import { fetchGscQueryPositions } from '@/lib/gsc/client'
import { matchTrackedKeywords } from '@/lib/gsc/match'
import type { TrackedKeyword } from '@/types'

export interface GscSyncResult {
  status: number
  body: { matched: number; total: number; summary: string } | { error: string }
}

// DB-integration logic extracted from app/api/sync/gsc/route.ts so both the manual sync
// button and the weekly cron (app/api/cron/weekly-snapshot/route.ts) can call it. Like the
// route it came from, this isn't unit-tested (codebase convention — only pure lib/ logic
// is; this needs a live Supabase client, same as every other sync route).
export async function runGscSync(admin: SupabaseClient, triggeredBy: string | null): Promise<GscSyncResult> {
  const settings = await getAppSettings(admin)

  if (!settings.gsc_site_url) {
    const message = 'GSC site URL is not configured — set it via /admin/settings'
    await admin.from('sync_logs').insert({ source: 'gsc', status: 'error', message, triggered_by: triggeredBy } as never)
    return { status: 502, body: { error: message } }
  }

  let rows
  try {
    rows = await fetchGscQueryPositions(settings.gsc_site_url)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'GSC sync failed'
    await admin.from('sync_logs').insert({ source: 'gsc', status: 'error', message, triggered_by: triggeredBy } as never)
    return { status: 502, body: { error: message } }
  }

  const { data: keywords, error: keywordsError } = await admin
    .from('tracked_keywords')
    .select('*')
    .eq('is_active', true)

  if (keywordsError) {
    await admin.from('sync_logs').insert({
      source: 'gsc',
      status: 'error',
      message: keywordsError.message,
      triggered_by: triggeredBy,
    } as never)
    return { status: 500, body: { error: keywordsError.message } }
  }

  const active = (keywords as TrackedKeyword[]) ?? []
  const matches = matchTrackedKeywords(active, rows)
  const today = new Date().toISOString().slice(0, 10)

  let succeeded = 0
  for (const match of matches) {
    const roundedPosition = Math.round(match.position)

    // If this keyword was already synced today, this is a same-day re-sync: keep the
    // existing previous_position instead of rolling it forward to today's already-written
    // current_position (which would permanently destroy the real prior rank).
    const isSameDayResync = match.keyword.position_updated_at?.slice(0, 10) === today
    const previousPosition = isSameDayResync ? match.keyword.previous_position : match.keyword.current_position

    const { error: updateError } = await admin
      .from('tracked_keywords')
      .update({
        previous_position: previousPosition,
        current_position: roundedPosition,
        position_updated_at: new Date().toISOString(),
      } as never)
      .eq('id', match.keyword.id)

    if (updateError) continue

    // Patch today's history row instead of duplicating it if this keyword was already
    // synced today (mirrors the "patch today's snapshot" pattern in the Ahrefs sync route).
    const { data: existingHistory } = await admin
      .from('keyword_history')
      .select('id')
      .eq('keyword_id', match.keyword.id)
      .eq('recorded_at', today)
      .maybeSingle()

    const { error: historyError } = existingHistory
      ? await admin
          .from('keyword_history')
          .update({ position: roundedPosition, url: match.page } as never)
          .eq('id', (existingHistory as { id: string }).id)
      : await admin.from('keyword_history').insert({
          keyword_id: match.keyword.id,
          recorded_at: today,
          position: roundedPosition,
          url: match.page,
        } as never)

    if (!historyError) succeeded++
  }

  const failed = matches.length - succeeded
  const summary = `Matched ${succeeded}/${active.length} tracked keywords from Search Console (last 90 days)${
    failed > 0 ? `; ${failed} update(s) failed` : ''
  }`

  await admin.from('sync_logs').insert({
    source: 'gsc',
    status: succeeded === 0 && matches.length > 0 ? 'error' : 'success',
    message: summary,
    triggered_by: triggeredBy,
  } as never)

  return { status: 200, body: { matched: succeeded, total: active.length, summary } }
}
