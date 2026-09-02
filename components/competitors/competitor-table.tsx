'use client'

import { Fragment, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Competitor, MetricSnapshot } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SortableTh, compareValues, type SortState } from '@/components/ui/sortable-th'
import { compareToEA, type MetricComparison } from '@/lib/competitors'
import { CompetitorHistoryRow } from './competitor-history-row'

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

function sortValue(c: Competitor, key: string): unknown {
  switch (key) {
    case 'company_name': return c.company_name
    case 'domain': return c.domain
    case 'domain_rating': return c.domain_rating
    case 'organic_traffic': return c.organic_traffic
    case 'organic_keywords': return c.organic_keywords
    case 'keywords_top_3': return c.keywords_top_3
    case 'est_traffic_value': return c.est_traffic_value
    case 'referring_domains': return c.referring_domains
    case 'last_synced_at': return c.last_synced_at
    default: return null
  }
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
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortState | null>(null)

  const visibleCompetitors = useMemo(() => {
    const q = search.trim().toLowerCase()
    let result = competitors
    if (q) result = competitors.filter((c) => c.company_name.toLowerCase().includes(q) || c.domain.toLowerCase().includes(q))
    if (sort) result = [...result].sort((a, b) => compareValues(sortValue(a, sort.key), sortValue(b, sort.key), sort.dir))
    return result
  }, [competitors, search, sort])

  function toggleSort(key: string) {
    setSort((s) => (s?.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }))
  }

  return (
    <div>
      <Input
        placeholder="Search competitors…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-3 max-w-sm"
      />
      <div className="overflow-x-auto rounded-md border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs font-medium uppercase text-muted-foreground">
            <tr>
              <SortableTh label="Company" sortKey="company_name" currentSort={sort} onSort={toggleSort} />
              <SortableTh label="Domain" sortKey="domain" currentSort={sort} onSort={toggleSort} />
              <SortableTh label="DR" sortKey="domain_rating" currentSort={sort} onSort={toggleSort} />
              <SortableTh label="Traffic/mo" sortKey="organic_traffic" currentSort={sort} onSort={toggleSort} />
              <SortableTh label="Keywords" sortKey="organic_keywords" currentSort={sort} onSort={toggleSort} />
              <SortableTh label="#1–3 Keywords" sortKey="keywords_top_3" currentSort={sort} onSort={toggleSort} />
              <SortableTh label="Est. Value" sortKey="est_traffic_value" currentSort={sort} onSort={toggleSort} />
              <SortableTh label="Ref. Domains" sortKey="referring_domains" currentSort={sort} onSort={toggleSort} />
              <SortableTh label="Last Synced" sortKey="last_synced_at" currentSort={sort} onSort={toggleSort} />
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
            {visibleCompetitors.map((c) => {
              const [dr, traffic, keywords, top3, value, refDomains] = compareToEA(c, eaSnapshot)
              return (
                <Fragment key={c.id}>
                  <tr className="hover:bg-muted/50">
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
                  <CompetitorHistoryRow competitorId={c.id} colSpan={isAdmin ? 9 : 8} />
                </Fragment>
              )
            })}
            {visibleCompetitors.length === 0 && (
              <tr>
                <td colSpan={isAdmin ? 10 : 9} className="px-4 py-6 text-center text-muted-foreground">No competitors match your search.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
