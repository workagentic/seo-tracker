import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/auth'
import { getLatestSnapshot } from '@/lib/metrics'
import { getQuarterlyTargets } from '@/lib/targets'
import { getCurrentQuarter } from '@/lib/constants'
import { StatTile } from '@/components/dashboard/stat-tile'
import { SyncButton } from '@/components/dashboard/sync-button'

const currency = (n: number) => `$${n.toLocaleString()}`
const decimal = (n: number) => n.toFixed(1)

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()
  const profile = await getCurrentProfile()
  const [snapshot, allTargets] = await Promise.all([getLatestSnapshot(supabase), getQuarterlyTargets(supabase)])
  const quarter = getCurrentQuarter(new Date())
  const targets = allTargets[quarter] ?? allTargets.Q1
  const canSync = profile && ['admin', 'head'].includes(profile.role)

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
    </div>
  )
}
