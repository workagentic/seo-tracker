import { NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/auth'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'

interface ImportRow {
  keyword: string
  volume?: string
  kd?: string
  cpc?: string
  category?: string
  priority?: string
  target_url?: string
}

export async function POST(request: Request) {
  const profile = await getCurrentProfile()
  if (!profile || !['admin', 'senior'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { rows }: { rows: ImportRow[] } = await request.json()
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'No rows to import' }, { status: 400 })
  }

  const admin = createAdminSupabaseClient()
  const payload = rows
    .filter((r) => r.keyword?.trim())
    .map((r) => ({
      keyword: r.keyword.trim(),
      monthly_volume: r.volume ? Number(r.volume) : null,
      keyword_difficulty: r.kd ? Number(r.kd) : null,
      cpc: r.cpc ? Number(r.cpc) : null,
      category: r.category || null,
      priority: r.priority || null,
      target_url: r.target_url || null,
    }))

  const { data, error } = await admin.from('tracked_keywords').insert(payload as never).select()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ imported: data.length })
}
