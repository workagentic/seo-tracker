import { NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/auth'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  const profile = await getCurrentProfile()
  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const body = await request.json()
  if (!body.company_name || !body.domain) {
    return NextResponse.json({ error: 'company_name and domain are required' }, { status: 400 })
  }
  const admin = createAdminSupabaseClient()
  const { data, error } = await admin
    .from('competitors')
    .insert({ company_name: body.company_name, domain: body.domain } as never)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ competitor: data })
}
