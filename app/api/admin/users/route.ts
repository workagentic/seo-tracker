import { NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/auth'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import type { Role } from '@/types'

export async function POST(request: Request) {
  const profile = await getCurrentProfile()
  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { full_name, email, role, job_title } = body as {
    full_name: string; email: string; role: Role; job_title?: string
  }
  if (!full_name || !email || !role) {
    return NextResponse.json({ error: 'full_name, email, and role are required' }, { status: 400 })
  }

  const admin = createAdminSupabaseClient()

  if (role === 'admin') {
    const { count } = await admin.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'admin')
    if ((count ?? 0) > 0) {
      return NextResponse.json({ error: 'Only one admin user is allowed (CLAUDE.md Section 12.10)' }, { status: 409 })
    }
  }

  const tempPassword = crypto.randomUUID()
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email, password: tempPassword, email_confirm: true,
  })
  if (createError) return NextResponse.json({ error: createError.message }, { status: 500 })

  const { data: newProfile, error: profileError } = await admin
    .from('profiles')
    .insert({ id: created.user.id, full_name, role, job_title: job_title ?? null } as never)
    .select()
    .single()
  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 })

  return NextResponse.json({ profile: newProfile, tempPassword })
}

export async function PATCH(request: Request) {
  const profile = await getCurrentProfile()
  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { id, is_active } = await request.json()
  const admin = createAdminSupabaseClient()
  const { error } = await admin.from('profiles').update({ is_active } as never).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
