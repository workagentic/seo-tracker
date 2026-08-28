import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'

// CLAUDE.md Section 9.2: a daily check sets status='overdue' on any task past its due date
// that isn't already completed/overdue. Same CRON_SECRET auth pattern as
// /api/cron/weekly-snapshot (Vercel Cron has no logged-in user).
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminSupabaseClient()
  const today = new Date().toISOString().slice(0, 10)

  const { data, error } = await admin
    .from('tasks')
    .update({ status: 'overdue', updated_at: new Date().toISOString() } as never)
    .lt('due_date', today)
    .in('status', ['pending', 'in_progress', 'blocked'])
    .select('id')

  if (error) {
    await admin.from('sync_logs').insert({
      source: 'daily-overdue-cron',
      status: 'error',
      message: error.message,
      triggered_by: null,
    } as never)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const count = data?.length ?? 0
  await admin.from('sync_logs').insert({
    source: 'daily-overdue-cron',
    status: 'success',
    message: `Marked ${count} task(s) overdue`,
    triggered_by: null,
  } as never)

  return NextResponse.json({ marked: count })
}
