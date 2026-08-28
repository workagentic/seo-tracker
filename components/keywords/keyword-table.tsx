'use client'

import { useMemo, useState } from 'react'
import type { TrackedKeyword } from '@/types'
import { Input } from '@/components/ui/input'
import { SortableTh, compareValues, type SortState } from '@/components/ui/sortable-th'

function sortValue(k: TrackedKeyword, key: string): unknown {
  switch (key) {
    case 'keyword': return k.keyword
    case 'monthly_volume': return k.monthly_volume
    case 'keyword_difficulty': return k.keyword_difficulty
    case 'current_position': return k.current_position
    case 'change': return k.current_position != null && k.previous_position != null ? k.previous_position - k.current_position : null
    case 'category': return k.category
    case 'priority': return k.priority
    case 'cpc': return k.cpc
    default: return null
  }
}

export function KeywordTable({ keywords }: { keywords: TrackedKeyword[] }) {
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortState | null>(null)

  const visibleKeywords = useMemo(() => {
    const q = search.trim().toLowerCase()
    let result = keywords
    if (q) result = keywords.filter((k) => k.keyword.toLowerCase().includes(q))
    if (sort) result = [...result].sort((a, b) => compareValues(sortValue(a, sort.key), sortValue(b, sort.key), sort.dir))
    return result
  }, [keywords, search, sort])

  function toggleSort(key: string) {
    setSort((s) => (s?.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }))
  }

  return (
    <div>
      <Input
        placeholder="Search keywords…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-3 max-w-sm"
      />
      <div className="overflow-x-auto rounded-md border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs font-medium uppercase text-muted-foreground">
            <tr>
              <SortableTh label="Keyword" sortKey="keyword" currentSort={sort} onSort={toggleSort} />
              <SortableTh label="Volume" sortKey="monthly_volume" currentSort={sort} onSort={toggleSort} />
              <SortableTh label="KD" sortKey="keyword_difficulty" currentSort={sort} onSort={toggleSort} />
              <SortableTh label="Position" sortKey="current_position" currentSort={sort} onSort={toggleSort} />
              <SortableTh label="Change" sortKey="change" currentSort={sort} onSort={toggleSort} />
              <th className="px-4 py-2">Target URL</th>
              <SortableTh label="Category" sortKey="category" currentSort={sort} onSort={toggleSort} />
              <SortableTh label="Priority" sortKey="priority" currentSort={sort} onSort={toggleSort} />
              <SortableTh label="CPC" sortKey="cpc" currentSort={sort} onSort={toggleSort} />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {visibleKeywords.map((k) => {
              const change = k.current_position != null && k.previous_position != null
                ? k.previous_position - k.current_position
                : null
              return (
                <tr key={k.id} className="hover:bg-muted/50">
                  <td className="px-4 py-2 font-medium text-foreground">{k.keyword}</td>
                  <td className="px-4 py-2 font-mono text-muted-foreground">{k.monthly_volume ?? '—'}</td>
                  <td className="px-4 py-2 font-mono text-muted-foreground">{k.keyword_difficulty ?? '—'}</td>
                  <td className="px-4 py-2 font-mono text-muted-foreground">
                    {k.current_position ?? <span className="italic text-muted-foreground/70">No data yet</span>}
                  </td>
                  <td className={`px-4 py-2 font-mono ${change && change > 0 ? 'text-green-600' : change && change < 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                    {change === null ? '—' : change === 0 ? '—' : change > 0 ? `▲${change}` : `▼${Math.abs(change)}`}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">{k.target_url ?? '—'}</td>
                  <td className="px-4 py-2 text-muted-foreground">{k.category ?? '—'}</td>
                  <td className="px-4 py-2 text-muted-foreground">{k.priority ?? '—'}</td>
                  <td className="px-4 py-2 font-mono text-muted-foreground">{k.cpc != null ? `$${k.cpc}` : '—'}</td>
                </tr>
              )
            })}
            {visibleKeywords.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-6 text-center text-muted-foreground">No keywords match your search.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
