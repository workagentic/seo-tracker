import { NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/auth'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { ELIGIBLE_OWNER_NAMES } from '@/lib/tasks/constants'

export async function POST(request: Request) {
  const profile = await getCurrentProfile()
  if (!profile || !['admin', 'senior'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  if (!body.title) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 })
  }

  const admin = createAdminSupabaseClient()

  // Senior is always fixed as the Owner of tasks it creates (CLAUDE.md Section 14 follow-up,
  // 3 Sep 2026) -- enforced here too, not just hidden in the UI, so a crafted request can't
  // set a different owner. Admin keeps free choice among the 3 eligible owners.
  const ownerId = profile.role === 'senior' ? profile.id : body.owner_id

  if (ownerId) {
    const { data: eligible } = await admin.from('profiles').select('id').in('full_name', ELIGIBLE_OWNER_NAMES)
    const eligibleIds = new Set(((eligible as { id: string }[]) ?? []).map((p) => p.id))
    if (!eligibleIds.has(ownerId)) {
      return NextResponse.json({ error: 'owner_id must be one of the 3 eligible owners' }, { status: 400 })
    }
  }
  if (body.deadline && body.due_date && body.deadline > body.due_date) {
    return NextResponse.json({ error: 'Deadline cannot be later than the Due date' }, { status: 400 })
  }

  const { data, error } = await admin
    .from('tasks')
    .insert({
      action_number: body.action_number || null,
      title: body.title,
      description: body.description || null,
      position_responsible: body.position_responsible || null,
      owner_id: ownerId || null,
      assigned_to_id: body.assigned_to_id || null,
      due_date: body.due_date || null,
      deadline: body.deadline || null,
      quarter: body.quarter || null,
      category_id: body.category_id || null,
      link_url: body.link_url || null,
      repeats: body.repeats || null,
      next_due: body.next_due || null,
      linked_finding_id: body.linked_finding_id || null,
      linked_keyword_id: body.linked_keyword_id || null,
      status: 'pending',
    } as never)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ task: data })
}
