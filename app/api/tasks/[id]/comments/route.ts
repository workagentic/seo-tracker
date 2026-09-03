import { NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { canCommentOnTask } from '@/lib/tasks/permissions'
import type { Task } from '@/types'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const profile = await getCurrentProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('task_comments')
    .select('*, author_profile:author_id(id, full_name)')
    .eq('task_id', id)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ comments: data })
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const profile = await getCurrentProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminSupabaseClient()
  // Every role can normally comment (reviewer included, since within Tasks reviewer's
  // permissions match expert's -- CLAUDE.md Section 14); once the task is locked (Completed/
  // On Hold), only the Owner and admin/senior retain that (Section 14 follow-up, 3 Sep 2026).
  const { data: task } = (await admin.from('tasks').select('*').eq('id', id).single()) as unknown as {
    data: Task | null
  }
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!canCommentOnTask(task, profile)) {
    return NextResponse.json({ error: 'Commenting is locked while this task is Completed or On Hold' }, { status: 403 })
  }

  const body = await request.json()
  if (typeof body.body !== 'string' || !body.body.trim()) {
    return NextResponse.json({ error: 'Comment body is required' }, { status: 400 })
  }
  const { data, error } = await admin
    .from('task_comments')
    .insert({ task_id: id, author_id: profile.id, body: body.body.trim() } as never)
    .select('*, author_profile:author_id(id, full_name)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ comment: data })
}
