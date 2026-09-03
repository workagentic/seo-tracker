import { NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'

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
  // Every current role can comment (reviewer included, since within Tasks reviewer's
  // permissions match expert's -- CLAUDE.md Section 14) -- no further gate beyond
  // authentication.

  const body = await request.json()
  if (typeof body.body !== 'string' || !body.body.trim()) {
    return NextResponse.json({ error: 'Comment body is required' }, { status: 400 })
  }

  const admin = createAdminSupabaseClient()
  const { data, error } = await admin
    .from('task_comments')
    .insert({ task_id: id, author_id: profile.id, body: body.body.trim() } as never)
    .select('*, author_profile:author_id(id, full_name)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ comment: data })
}
