import { NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/auth'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { runClaritySync } from '@/lib/clarity/sync'

export async function POST() {
  const profile = await getCurrentProfile()
  if (!profile || !['admin', 'senior'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = createAdminSupabaseClient()
  const result = await runClaritySync(admin, profile.id)
  return NextResponse.json(result.body, { status: result.status })
}
