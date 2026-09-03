import { NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/auth'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'

// Admin CRUD for task_categories (CLAUDE.md Section 14 Phase 4 -- the table itself and its
// 11 seed values were created in Phase 2, migration 0024_task_ownership_rebuild.sql; this is
// the CRUD UI/API that was deferred to Phase 4).
export async function POST(request: Request) {
  const profile = await getCurrentProfile()
  if (!profile || !['admin', 'senior'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  if (typeof body.name !== 'string' || !body.name.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }

  const admin = createAdminSupabaseClient()
  const { data, error } = await admin
    .from('task_categories')
    .insert({ name: body.name.trim() } as never)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ category: data })
}
