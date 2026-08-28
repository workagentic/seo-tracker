import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/auth'
import { getLatestSnapshot, getAllSnapshots } from '@/lib/metrics'
import { getLatestGa4Snapshot } from '@/lib/ga4-snapshots'
import { getLatestClaritySnapshot } from '@/lib/clarity-snapshots'
import { getQuarterlyTargets } from '@/lib/targets'
import { getCurrentQuarter } from '@/lib/constants'
import { StatTile } from '@/components/dashboard/stat-tile'
import { SyncButton } from '@/components/dashboard/sync-button'
import { Ga4Panel } from '@/components/dashboard/ga4-panel'
import { ClarityPanel } from '@/components/dashboard/clarity-panel'
import { TrafficTrendChart, type TrafficTrendPoint } from '@/components/dashboard/charts/traffic-trend-chart'
import { DomainRatingChart, type DrPoint } from '@/components/dashboard/charts/domain-rating-chart'
import { KeywordsDistributionChart } from '@/components/dashboard/charts/keywords-distribution-chart'
import { CompetitorMetricBarChart, type CompetitorMetricRow } from '@/components/dashboard/charts/competitor-metric-bar-chart'
import type { Competitor } from '@/types'

const currency = (n: number) => `$${n.toLocaleString()}`
const decimal = (n: number) => n.toFixed(1)

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()
  const profile = await getCurrentProfile()
  const [snapshot, allSnapshots, allTargets, { data: competitorsData }, ga4Snapshot, claritySnapshot] = await Promise.all([
    getLatestSnapshot(supabase),
    getAllSnapshots(supabase),
    getQuarterlyTargets(supabase),
    supabase.from('competitors').select('*').eq('is_active', true),
    getLatestGa4Snapshot(supabase),
    getLatestClaritySnapshot(supabase),
  ])
  const quarter = getCurrentQuarter(new Date())
  const targets = allTargets[quarter] ?? allTargets.Q1
  const canSync = profile && ['admin', 'head'].includes(profile.role)
  const competitors = (competitorsData as Competitor[]) ?? []

  const trafficTrend: TrafficTrendPoint[] = allSnapshots.map((s) => ({
    date: new Date(s.snapshot_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
    global: s.organic_traffic_global,
    us: s.organic_traffic_us,
  }))
  const drTrend: DrPoint[] = allSnapshots.map((s) => ({
    date: new Date(s.snapshot_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
    domain_rating: s.domain_rating,
  }))

  const eaTop3 = snapshot?.keywords_top_3 ?? null
  const eaTop10 = snapshot?.keywords_top_10 ?? null
  const eaTop4to10 = eaTop3 !== null && eaTop10 !== null ? Math.max(eaTop10 - eaTop3, 0) : null

  function competitorRows(metric: keyof Competitor, eaValue: number | null): CompetitorMetricRow[] {
    const rows: CompetitorMetricRow[] = []
    if (eaValue !== null) rows.push({ name: 'EA', value: eaValue, isEA: true })
    for (const c of competitors) {
      const value = c[metric] as number | null
      if (value !== null) rows.push({ name: c.company_name, value, isEA: false })
    }
    return rows
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            {targets.label} — Target date: {new Date(targets.date).toLocaleDateString('en-GB', {
              day: '2-digit', month: 'short', year: 'numeric',
            })}
          </h1>
          <p className="text-sm text-muted-foreground">
            Last sync: {snapshot ? new Date(snapshot.created_at).toLocaleString() : 'never'}
          </p>
        </div>
        {canSync && <SyncButton />}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Domain Rating" actual={snapshot?.domain_rating ?? null} target={targets.domain_rating} />
        <StatTile label="Organic Traffic / mo (Global)" actual={snapshot?.organic_traffic_global ?? null} target={targets.organic_traffic_global} />
        <StatTile label="Organic Traffic / mo (US)" actual={snapshot?.organic_traffic_us ?? null} target={targets.organic_traffic_us} />
        <StatTile label="Organic Keywords (Global)" actual={snapshot?.organic_keywords_global ?? null} target={targets.organic_keywords_global} />
        <StatTile label="Organic Keywords (US)" actual={snapshot?.organic_keywords_us ?? null} target={targets.organic_keywords_us} />
        <StatTile label="Keywords Ranked #1–3" actual={snapshot?.keywords_top_3 ?? null} target={targets.keywords_top_3} />
        <StatTile label="Keywords in Top 10" actual={snapshot?.keywords_top_10 ?? null} target={targets.keywords_top_10} />
        <StatTile label="Est. Traffic Value / mo" actual={snapshot?.traffic_value_monthly ?? null} target={targets.traffic_value_monthly} format={currency} />
        <StatTile label="Referring Domains (Total)" actual={snapshot?.referring_domains_total ?? null} target={targets.referring_domains_total} />
        <StatTile label="Quality Ref. Domains (DR30+, dofollow)" actual={snapshot?.referring_domains_quality ?? null} target={targets.referring_domains_quality} />
        <StatTile label="Avg. Keywords per Ranking Page" actual={snapshot?.avg_keywords_per_page ?? null} target={targets.avg_keywords_per_page} format={decimal} />
        <StatTile label="Live Indexed Content Pages" actual={snapshot?.indexed_content_pages ?? null} target={targets.indexed_content_pages} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-md border border-border bg-card p-4">
          <h2 className="mb-2 text-sm font-medium text-foreground">Traffic Trend</h2>
          <TrafficTrendChart data={trafficTrend} globalTarget={targets.organic_traffic_global} usTarget={targets.organic_traffic_us} />
        </div>
        <div className="rounded-md border border-border bg-card p-4">
          <h2 className="mb-2 text-sm font-medium text-foreground">Domain Rating Progression</h2>
          <DomainRatingChart data={drTrend} target={targets.domain_rating} />
        </div>
        <div className="rounded-md border border-border bg-card p-4">
          <h2 className="mb-2 text-sm font-medium text-foreground">Keywords Distribution</h2>
          <KeywordsDistributionChart top3={eaTop3} top4to10={eaTop4to10} />
        </div>
        <div className="space-y-4 rounded-md border border-border bg-card p-4">
          <h2 className="text-sm font-medium text-foreground">Competitor Comparison</h2>
          <CompetitorMetricBarChart title="Domain Rating" rows={competitorRows('domain_rating', snapshot?.domain_rating ?? null)} />
          <CompetitorMetricBarChart title="Organic Traffic / mo" rows={competitorRows('organic_traffic', snapshot?.organic_traffic_global ?? null)} />
          <CompetitorMetricBarChart title="Organic Keywords" rows={competitorRows('organic_keywords', snapshot?.organic_keywords_global ?? null)} />
        </div>
      </div>

      <div className="rounded-md border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-foreground">Website Analytics (GA4)</h2>
          {canSync && <SyncButton endpoint="/api/sync/ga4" label="Sync GA4" />}
        </div>
        <Ga4Panel snapshot={ga4Snapshot} />
      </div>

      <div className="rounded-md border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-foreground">Content Performance (Clarity)</h2>
          {canSync && <SyncButton endpoint="/api/sync/clarity" label="Sync Clarity" />}
        </div>
        <ClarityPanel snapshot={claritySnapshot} />
      </div>
    </div>
  )
}
