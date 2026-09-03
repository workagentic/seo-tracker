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
    .select('*, author_profile:author_id(id, full_name), images:task_comment_images(id, comment_id, image_url, created_at)')
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
  const text = typeof body.body === 'string' ? body.body.trim() : ''
  // Pasted screenshots (CLAUDE.md Section 14 follow-up, 3 Sep 2026) -- already-uploaded URLs
  // from POST /api/uploads/task-image, attached at post time. A comment needs text OR at
  // least one image, not necessarily both (a bare screenshot with no caption is a valid post).
  const imageUrls: string[] = Array.isArray(body.image_urls)
    ? body.image_urls.filter((u: unknown): u is string => typeof u === 'string' && u.trim().length > 0)
    : []
  if (!text && imageUrls.length === 0) {
    return NextResponse.json({ error: 'Comment body or at least one image is required' }, { status: 400 })
  }

  const { data: comment, error } = await admin
    .from('task_comments')
    .insert({ task_id: id, author_id: profile.id, body: text } as never)
    .select('*, author_profile:author_id(id, full_name)')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const commentId = (comment as { id: string }).id
  if (imageUrls.length > 0) {
    const { error: imagesError } = await admin
      .from('task_comment_images')
      .insert(imageUrls.map((image_url) => ({ comment_id: commentId, image_url })) as never)
    if (imagesError) return NextResponse.json({ error: imagesError.message }, { status: 500 })
  }

  const { data: images } = await admin
    .from('task_comment_images')
    .select('id, comment_id, image_url, created_at')
    .eq('comment_id', commentId)

  return NextResponse.json({ comment: { ...(comment as Record<string, unknown>), images: images ?? [] } })
}
