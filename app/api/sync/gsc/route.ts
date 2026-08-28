import { NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/auth'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { runGscSync } from '@/lib/gsc/sync'

export async function POST() {
  const profile = await getCurrentProfile()
  if (!profile || !['admin', 'head'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = createAdminSupabaseClient()
  const result = await runGscSync(admin, profile.id)
  return NextResponse.json(result.body, { status: result.status })
}
