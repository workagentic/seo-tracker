import type { TrackedKeyword } from '@/types'

export function KeywordTable({ keywords }: { keywords: TrackedKeyword[] }) {
  return (
    <div className="overflow-x-auto rounded-md border border-border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-muted text-left text-xs font-medium uppercase text-muted-foreground">
          <tr>
            <th className="px-4 py-2">Keyword</th>
            <th className="px-4 py-2">Volume</th>
            <th className="px-4 py-2">KD</th>
            <th className="px-4 py-2">Position</th>
            <th className="px-4 py-2">Change</th>
            <th className="px-4 py-2">Target URL</th>
            <th className="px-4 py-2">Category</th>
            <th className="px-4 py-2">Priority</th>
            <th className="px-4 py-2">CPC</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {keywords.map((k) => {
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
        </tbody>
      </table>
    </div>
  )
}
