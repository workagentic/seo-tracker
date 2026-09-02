import { NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/auth'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  const profile = await getCurrentProfile()
  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  if (!body.action_number || !body.title) {
    return NextResponse.json({ error: 'action_number and title are required' }, { status: 400 })
  }

  const admin = createAdminSupabaseClient()
  const { data, error } = await admin
    .from('tasks')
    .insert({
      action_number: body.action_number,
      title: body.title,
      description: body.description || null,
      position_responsible: body.position_responsible || null,
      assigned_to: body.assigned_to || null,
      co_assigned_to: body.co_assigned_to || null,
      approver_id: body.approver_id || null,
      due_date: body.due_date || null,
      quarter: body.quarter || null,
      category: body.category || null,
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
