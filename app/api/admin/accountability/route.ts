import { NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/auth'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'

// Admin-editable Scorecard "Accountable Owner" mapping (CLAUDE.md Section 14 Phase 5) --
// upserts since a metric_key not yet in metric_accountability (e.g. one of the 2 the original
// ACCOUNTABILITY_MAP constant never covered) should become editable too, not just the 10
// pre-seeded rows.
export async function PATCH(request: Request) {
  const profile = await getCurrentProfile()
  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { metric_key, owner_names } = body as { metric_key?: string; owner_names?: string[] }
  if (!metric_key || !Array.isArray(owner_names)) {
    return NextResponse.json({ error: 'metric_key and owner_names (array) are required' }, { status: 400 })
  }

  const admin = createAdminSupabaseClient()
  const { error } = await admin
    .from('metric_accountability')
    .upsert(
      { metric_key, owner_names, updated_by: profile.id, updated_at: new Date().toISOString() } as never,
      { onConflict: 'metric_key' }
    )
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
