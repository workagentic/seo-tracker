import { NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/auth'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { getAppSettings } from '@/lib/settings'
import { fetchGscQueryPositions } from '@/lib/gsc/client'
import { matchTrackedKeywords } from '@/lib/gsc/match'
import type { TrackedKeyword } from '@/types'

export async function POST() {
  const profile = await getCurrentProfile()
  if (!profile || !['admin', 'head'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = createAdminSupabaseClient()
  const settings = await getAppSettings(admin)

  if (!settings.gsc_site_url) {
    const message = 'GSC site URL is not configured — set it via /admin/settings'
    await admin
      .from('sync_logs')
      .insert({ source: 'gsc', status: 'error', message, triggered_by: profile.id } as never)
    return NextResponse.json({ error: message }, { status: 502 })
  }

  let rows
  try {
    rows = await fetchGscQueryPositions(settings.gsc_site_url)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'GSC sync failed'
    await admin
      .from('sync_logs')
      .insert({ source: 'gsc', status: 'error', message, triggered_by: profile.id } as never)
    return NextResponse.json({ error: message }, { status: 502 })
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
      triggered_by: profile.id,
    } as never)
    return NextResponse.json({ error: keywordsError.message }, { status: 500 })
  }

  const active = (keywords as TrackedKeyword[]) ?? []
  const matches = matchTrackedKeywords(active, rows)
  const today = new Date().toISOString().slice(0, 10)

  let succeeded = 0
  for (const match of matches) {
    const roundedPosition = Math.round(match.position)
    const { error: updateError } = await admin
      .from('tracked_keywords')
      .update({
        previous_position: match.keyword.current_position,
        current_position: roundedPosition,
        position_updated_at: new Date().toISOString(),
      } as never)
      .eq('id', match.keyword.id)

    if (updateError) continue

    const { error: historyError } = await admin.from('keyword_history').insert({
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
    triggered_by: profile.id,
  } as never)

  return NextResponse.json({ matched: succeeded, total: active.length, summary })
}
