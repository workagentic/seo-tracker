import { NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/auth'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  const profile = await getCurrentProfile()
  if (!profile || !['admin', 'head'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const body = await request.json()
  if (!body.title || !body.finding) {
    return NextResponse.json({ error: 'title and finding are required' }, { status: 400 })
  }
  const admin = createAdminSupabaseClient()
  const { data, error } = await admin
    .from('audit_reports')
    .insert({
      title: body.title,
      category: body.category ?? null,
      severity: body.severity ?? null,
      finding: body.finding,
      recommendation: body.recommendation ?? null,
      assigned_to: body.assigned_to ?? null,
    } as never)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ finding: data })
}
