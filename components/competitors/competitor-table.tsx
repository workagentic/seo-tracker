'use client'

import { useRouter } from 'next/navigation'
import type { Competitor, MetricSnapshot } from '@/types'
import { Button } from '@/components/ui/button'
import { compareToEA, type MetricComparison } from '@/lib/competitors'

function DeltaBadge({ comparison }: { comparison: MetricComparison }) {
  if (comparison.direction === 'no-data' || comparison.deltaPct === null) return null

  const color =
    comparison.direction === 'up'
      ? 'text-green-600'
      : comparison.direction === 'down'
        ? 'text-red-600'
        : 'text-muted-foreground'
  const arrow = comparison.direction === 'up' ? '▲' : comparison.direction === 'down' ? '▼' : '–'

  return (
    <span className={`ml-1 font-mono text-xs ${color}`}>
      {arrow}
      {Math.abs(comparison.deltaPct).toFixed(0)}%
    </span>
  )
}

function CompetitorCell({ value, comparison }: { value: number | null; comparison: MetricComparison }) {
  return (
    <td className="px-4 py-2 font-mono text-muted-foreground">
      {value ?? '—'}
      <DeltaBadge comparison={comparison} />
    </td>
  )
}

export function CompetitorTable({
  competitors,
  isAdmin,
  eaSnapshot,
}: {
  competitors: Competitor[]
  isAdmin: boolean
  eaSnapshot: MetricSnapshot | null
}) {
  const router = useRouter()

  return (
    <div className="overflow-x-auto rounded-md border border-border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-muted text-left text-xs font-medium uppercase text-muted-foreground">
          <tr>
            <th className="px-4 py-2">Company</th>
            <th className="px-4 py-2">Domain</th>
            <th className="px-4 py-2">DR</th>
            <th className="px-4 py-2">Traffic/mo</th>
            <th className="px-4 py-2">Keywords</th>
            <th className="px-4 py-2">#1–3 Keywords</th>
            <th className="px-4 py-2">Est. Value</th>
            <th className="px-4 py-2">Ref. Domains</th>
            <th className="px-4 py-2">Last Synced</th>
            {isAdmin && <th className="px-4 py-2" />}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          <tr className="bg-primary/5 font-medium">
            <td className="px-4 py-2 text-foreground">Expertise Accelerated (EA)</td>
            <td className="px-4 py-2 text-muted-foreground">expertiseaccelerated.com</td>
            <td className="px-4 py-2 font-mono text-foreground">{eaSnapshot?.domain_rating ?? '—'}</td>
            <td className="px-4 py-2 font-mono text-foreground">{eaSnapshot?.organic_traffic_global ?? '—'}</td>
            <td className="px-4 py-2 font-mono text-foreground">{eaSnapshot?.organic_keywords_global ?? '—'}</td>
            <td className="px-4 py-2 font-mono text-foreground">{eaSnapshot?.keywords_top_3 ?? '—'}</td>
            <td className="px-4 py-2 font-mono text-foreground">
              {eaSnapshot?.traffic_value_monthly ? `$${eaSnapshot.traffic_value_monthly.toLocaleString()}` : '—'}
            </td>
            <td className="px-4 py-2 font-mono text-foreground">{eaSnapshot?.referring_domains_total ?? '—'}</td>
            <td className="px-4 py-2 text-muted-foreground">
              {eaSnapshot?.snapshot_date ? new Date(eaSnapshot.snapshot_date).toLocaleDateString() : 'never'}
            </td>
            {isAdmin && <td className="px-4 py-2" />}
          </tr>
          {competitors.map((c) => {
            const [dr, traffic, keywords, top3, value, refDomains] = compareToEA(c, eaSnapshot)
            return (
              <tr key={c.id} className="hover:bg-muted/50">
                <td className="px-4 py-2 font-medium text-foreground">{c.company_name}</td>
                <td className="px-4 py-2 text-muted-foreground">{c.domain}</td>
                <CompetitorCell value={c.domain_rating} comparison={dr} />
                <CompetitorCell value={c.organic_traffic} comparison={traffic} />
                <CompetitorCell value={c.organic_keywords} comparison={keywords} />
                <CompetitorCell value={c.keywords_top_3} comparison={top3} />
                <td className="px-4 py-2 font-mono text-muted-foreground">
                  {c.est_traffic_value ? `$${c.est_traffic_value.toLocaleString()}` : '—'}
                  <DeltaBadge comparison={value} />
                </td>
                <CompetitorCell value={c.referring_domains} comparison={refDomains} />
                <td className="px-4 py-2 text-muted-foreground">{c.last_synced_at ? new Date(c.last_synced_at).toLocaleDateString() : 'never'}</td>
                {isAdmin && (
                  <td className="px-4 py-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        await fetch(`/api/competitors/${c.id}`, { method: 'DELETE' })
                        router.refresh()
                      }}
                    >
                      Remove
                    </Button>
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
