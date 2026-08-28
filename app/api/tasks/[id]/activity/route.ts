import { NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const profile = await getCurrentProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('task_activity')
    .select('*, changed_by_profile:changed_by(id, full_name)')
    .eq('task_id', id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ activity: data })
}
