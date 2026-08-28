import type { SupabaseClient } from '@supabase/supabase-js'
import { calculateRAG } from '@/lib/rag'
import type {
  MetricSnapshot,
  QuarterTarget,
  TrackedKeyword,
  WeeklyReportKpi,
  WeeklyReportMetricMove,
  WeeklyReportKeywordMover,
  WeeklyReportSummary,
  WeeklyReportTask,
  Task,
  MetricKey,
} from '@/types'

const KPI_FIELDS: { key: MetricKey; label: string }[] = [
  { key: 'domain_rating', label: 'Domain Rating' },
  { key: 'organic_traffic_global', label: 'Organic Traffic (Global)' },
  { key: 'organic_traffic_us', label: 'Organic Traffic (US)' },
  { key: 'organic_keywords_global', label: 'Organic Keywords (Global)' },
  { key: 'organic_keywords_us', label: 'Organic Keywords (US)' },
  { key: 'keywords_top_3', label: 'Keywords Ranked #1–3' },
  { key: 'keywords_top_10', label: 'Keywords in Top 10' },
  { key: 'traffic_value_monthly', label: 'Est. Traffic Value / mo' },
  { key: 'referring_domains_total', label: 'Referring Domains (Total)' },
  { key: 'referring_domains_quality', label: 'Quality Ref. Domains' },
  { key: 'avg_keywords_per_page', label: 'Avg. Keywords per Page' },
  { key: 'indexed_content_pages', label: 'Live Indexed Content Pages' },
]

export function buildKpiList(snapshot: MetricSnapshot | null, target: QuarterTarget): WeeklyReportKpi[] {
  return KPI_FIELDS.map(({ key, label }) => {
    const actual = snapshot ? snapshot[key] : null
    return { key, label, actual, target: target[key], ragStatus: calculateRAG(actual, target[key]) }
  })
}

export function buildMetricsMoved(
  previous: MetricSnapshot | null,
  current: MetricSnapshot | null
): WeeklyReportMetricMove[] {
  if (!previous || !current) return []
  const moves: WeeklyReportMetricMove[] = []
  for (const { key, label } of KPI_FIELDS) {
    const prevValue = previous[key]
    const currValue = current[key]
    if (prevValue === currValue) continue
    if (prevValue === null || currValue === null) continue
    const deltaPct = prevValue === 0 ? null : ((currValue - prevValue) / prevValue) * 100
    moves.push({ key, label, previous: prevValue, current: currValue, deltaPct })
  }
  return moves
}

const TOP_MOVERS_COUNT = 5

export function buildKeywordMovers(keywords: TrackedKeyword[]): WeeklyReportKeywordMover[] {
  const withChange = keywords
    .filter((k) => k.current_position !== null && k.previous_position !== null)
    .map((k) => ({
      keyword: k.keyword,
      previous_position: k.previous_position,
      current_position: k.current_position,
      change: (k.previous_position as number) - (k.current_position as number),
    }))
    .filter((m) => m.change !== 0)

  const risers = [...withChange].sort((a, b) => b.change - a.change).slice(0, TOP_MOVERS_COUNT)
  const fallers = [...withChange].sort((a, b) => a.change - b.change).slice(0, TOP_MOVERS_COUNT)

  const seen = new Set<string>()
  const combined: WeeklyReportKeywordMover[] = []
  for (const m of [...risers, ...fallers]) {
    if (seen.has(m.keyword)) continue
    seen.add(m.keyword)
    combined.push(m)
  }
  return combined
}

function taskToReportTask(task: Task & { assigned_profile?: { full_name: string } | null }): WeeklyReportTask {
  return {
    id: task.id,
    action_number: task.action_number,
    title: task.title,
    due_date: task.due_date,
    owner: task.assigned_profile?.full_name ?? null,
  }
}

export interface WeeklyReportRange {
  weekStart: string
  weekEnd: string
}

// Monday-Sunday week containing `now`, ISO date strings.
export function getWeekRange(now: Date): WeeklyReportRange {
  const day = now.getUTCDay() // 0=Sun..6=Sat
  const diffToMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setUTCDate(now.getUTCDate() + diffToMonday)
  const sunday = new Date(monday)
  sunday.setUTCDate(monday.getUTCDate() + 6)
  return { weekStart: monday.toISOString().slice(0, 10), weekEnd: sunday.toISOString().slice(0, 10) }
}

// DB-integration logic — untested per this codebase's convention (needs a live Supabase
// client), same shape as lib/gsc/sync.ts and friends.
export async function generateAndSaveWeeklyReport(
  admin: SupabaseClient,
  target: QuarterTarget,
  triggeredBy: string | null
): Promise<WeeklyReportSummary> {
  const today = new Date().toISOString().slice(0, 10)
  const in7Days = new Date()
  in7Days.setDate(in7Days.getDate() + 7)
  const in7DaysIso = in7Days.toISOString().slice(0, 10)

  const [
    { data: snapshots },
    { data: dueSoonTasks },
    { data: overdueTasks },
    { data: keywords },
  ] = await Promise.all([
    admin.from('metric_snapshots').select('*').order('snapshot_date', { ascending: false }).order('created_at', { ascending: false }).limit(2),
    admin
      .from('tasks')
      .select('*, assigned_profile:assigned_to(id, full_name)')
      .gte('due_date', today)
      .lte('due_date', in7DaysIso)
      .neq('status', 'completed'),
    admin
      .from('tasks')
      .select('*, assigned_profile:assigned_to(id, full_name)')
      .lt('due_date', today)
      .neq('status', 'completed'),
    admin.from('tracked_keywords').select('*').eq('is_active', true),
  ])

  const [current, previous] = ((snapshots as MetricSnapshot[]) ?? []) as [MetricSnapshot?, MetricSnapshot?]

  const summary: WeeklyReportSummary = {
    kpis: buildKpiList(current ?? null, target),
    tasksDueSoon: ((dueSoonTasks as Task[]) ?? []).map(taskToReportTask),
    tasksOverdue: ((overdueTasks as Task[]) ?? []).map(taskToReportTask),
    metricsMoved: buildMetricsMoved(previous ?? null, current ?? null),
    keywordMovers: buildKeywordMovers((keywords as TrackedKeyword[]) ?? []),
  }

  const { weekStart, weekEnd } = getWeekRange(new Date())

  const { data: recipients } = await admin.from('profiles').select('id, full_name').in('full_name', ['Talha Azeem', 'Syed Ali'])
  const recipientIds = ((recipients as { id: string }[]) ?? []).map((r) => r.id)

  const { data: existing } = await admin
    .from('weekly_reports')
    .select('id')
    .eq('week_start', weekStart)
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const fields = { week_start: weekStart, week_end: weekEnd, summary, recipient_ids: recipientIds, generated_at: new Date().toISOString() }

  if (existing) {
    await admin.from('weekly_reports').update(fields as never).eq('id', (existing as { id: string }).id)
  } else {
    await admin.from('weekly_reports').insert(fields as never)
  }

  await admin.from('sync_logs').insert({
    source: 'weekly-report',
    status: 'success',
    message: `Generated weekly report for ${weekStart} – ${weekEnd}`,
    triggered_by: triggeredBy,
  } as never)

  return summary
}
