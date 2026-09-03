import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/auth'
import { RagBadge } from '@/components/dashboard/rag-badge'
import { GenerateReportButton } from '@/components/weekly-report/generate-report-button'
import type { WeeklyReport } from '@/types'

function formatKpiValue(key: string, value: number | null): string {
  if (value === null) return '—'
  if (key === 'traffic_value_monthly') return `$${value.toLocaleString()}`
  if (key === 'avg_keywords_per_page') return value.toFixed(1)
  return value.toLocaleString()
}

export default async function WeeklyReportPage() {
  const profile = await getCurrentProfile()
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('weekly_reports')
    .select('*')
    .order('week_start', { ascending: false })
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const report = (data as WeeklyReport | null) ?? null
  const summary = report?.summary ?? null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Weekly Report</h1>
          <p className="text-sm text-muted-foreground">
            {report
              ? `Week of ${report.week_start} – ${report.week_end} · generated ${new Date(report.generated_at).toLocaleString()}`
              : 'No report generated yet.'}
          </p>
        </div>
        {profile?.role === 'admin' && <GenerateReportButton />}
      </div>

      {!summary && (
        <p className="text-sm text-muted-foreground">
          {profile?.role === 'admin'
            ? 'Click "Generate Report" to create the first one.'
            : 'No report has been generated yet — ask an admin to generate one, or wait for Monday’s automated run.'}
        </p>
      )}

      {summary && (
        <>
          <section className="rounded-md border border-border bg-card p-4">
            <h2 className="mb-3 text-sm font-medium text-foreground">KPIs vs. Target</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted text-left text-xs font-medium uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2">Metric</th>
                    <th className="px-4 py-2">Actual</th>
                    <th className="px-4 py-2">Target</th>
                    <th className="px-4 py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {summary.kpis.map((kpi) => (
                    <tr key={kpi.key} className="hover:bg-muted/50">
                      <td className="px-4 py-2 text-foreground">{kpi.label}</td>
                      <td className="px-4 py-2 font-mono text-muted-foreground">{formatKpiValue(kpi.key, kpi.actual)}</td>
                      <td className="px-4 py-2 font-mono text-muted-foreground">{formatKpiValue(kpi.key, kpi.target)}</td>
                      <td className="px-4 py-2"><RagBadge status={kpi.ragStatus} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <section className="rounded-md border border-border bg-card p-4">
              <h2 className="mb-3 text-sm font-medium text-foreground">Tasks Due in the Next 7 Days</h2>
              {summary.tasksDueSoon.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing due soon.</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {summary.tasksDueSoon.map((t) => (
                    <li key={t.id} className="flex items-center justify-between">
                      <span className="text-foreground">{t.action_number ? `${t.action_number} — ${t.title}` : t.title}</span>
                      <span className="ml-2 shrink-0 text-muted-foreground">{t.owner ?? '—'} · {t.due_date}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-md border border-border bg-card p-4">
              <h2 className="mb-3 text-sm font-medium text-foreground">Overdue Tasks</h2>
              {summary.tasksOverdue.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing overdue.</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {summary.tasksOverdue.map((t) => (
                    <li key={t.id} className="flex items-center justify-between">
                      <span className="text-foreground">{t.action_number ? `${t.action_number} — ${t.title}` : t.title}</span>
                      <span className="ml-2 shrink-0 font-medium text-red-600">{t.owner ?? '—'} · {t.due_date}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-md border border-border bg-card p-4">
              <h2 className="mb-3 text-sm font-medium text-foreground">Metrics That Moved</h2>
              {summary.metricsMoved.length === 0 ? (
                <p className="text-sm text-muted-foreground">No change since the last snapshot.</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {summary.metricsMoved.map((m) => (
                    <li key={m.key} className="flex items-center justify-between">
                      <span className="text-foreground">{m.label}</span>
                      <span className="font-mono text-muted-foreground">
                        {formatKpiValue(m.key, m.previous)} → {formatKpiValue(m.key, m.current)}
                        {m.deltaPct !== null && (
                          <span className={m.deltaPct >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {' '}({m.deltaPct >= 0 ? '+' : ''}{m.deltaPct.toFixed(1)}%)
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-md border border-border bg-card p-4">
              <h2 className="mb-3 text-sm font-medium text-foreground">Keyword Movers</h2>
              {summary.keywordMovers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No position changes to report.</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {summary.keywordMovers.map((k) => (
                    <li key={k.keyword} className="flex items-center justify-between">
                      <span className="truncate text-foreground">{k.keyword}</span>
                      <span className={`ml-2 shrink-0 font-mono ${k.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {k.previous_position} → {k.current_position} ({k.change > 0 ? '▲' : '▼'}{Math.abs(k.change)})
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  )
}
