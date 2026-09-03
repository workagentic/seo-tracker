import { NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/auth'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { canCommentOnTask } from '@/lib/tasks/permissions'
import type { Task, TaskComment } from '@/types'

// Comments became editable/deletable 2 Sep 2026 (CLAUDE.md Section 14 Phase 3) -- a change
// from the append-only design task_comments shipped with. Soft-delete (deleted_at set, body
// left in place but the UI renders "[comment deleted]" instead of it) rather than a hard
// DELETE, so a removed comment doesn't silently renumber or vanish from a thread someone else
// is mid-read of.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; commentId: string }> }) {
  const { commentId } = await params
  const profile = await getCurrentProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminSupabaseClient()
  const { data: comment } = (await admin.from('task_comments').select('*').eq('id', commentId).single()) as unknown as {
    data: TaskComment | null
  }
  if (!comment || comment.deleted_at) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Editing your own words is author-only -- admin's moderation power (below, DELETE) doesn't
  // extend to rewriting someone else's comment.
  if (comment.author_id !== profile.id) {
    return NextResponse.json({ error: 'Only the comment author can edit it' }, { status: 403 })
  }

  // Even your own comment is locked once the task is Completed/On Hold, unless you're the
  // Owner or admin/senior (CLAUDE.md Section 14 follow-up, 3 Sep 2026).
  const { data: task } = (await admin.from('tasks').select('*').eq('id', comment.task_id).single()) as unknown as {
    data: Task | null
  }
  if (task && !canCommentOnTask(task, profile)) {
    return NextResponse.json({ error: 'Commenting is locked while this task is Completed or On Hold' }, { status: 403 })
  }

  const body = await request.json()
  if (typeof body.body !== 'string' || !body.body.trim()) {
    return NextResponse.json({ error: 'Comment body is required' }, { status: 400 })
  }

  const { data, error } = await admin
    .from('task_comments')
    .update({ body: body.body.trim(), edited_at: new Date().toISOString() } as never)
    .eq('id', commentId)
    .select('*, author_profile:author_id(id, full_name)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ comment: data })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; commentId: string }> }) {
  const { commentId } = await params
  const profile = await getCurrentProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminSupabaseClient()
  const { data: comment } = (await admin.from('task_comments').select('*').eq('id', commentId).single()) as unknown as {
    data: TaskComment | null
  }
  if (!comment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isModerator = ['admin', 'senior'].includes(profile.role)
  if (comment.author_id !== profile.id && !isModerator) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Deleting your own comment is also locked once the task is Completed/On Hold, unless
  // you're the Owner or admin/senior -- admin/senior's moderation delete of ANY comment is
  // unaffected (CLAUDE.md Section 14 follow-up, 3 Sep 2026).
  if (!isModerator) {
    const { data: task } = (await admin.from('tasks').select('*').eq('id', comment.task_id).single()) as unknown as {
      data: Task | null
    }
    if (task && !canCommentOnTask(task, profile)) {
      return NextResponse.json({ error: 'Commenting is locked while this task is Completed or On Hold' }, { status: 403 })
    }
  }

  const { error } = await admin
    .from('task_comments')
    .update({ deleted_at: new Date().toISOString() } as never)
    .eq('id', commentId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
