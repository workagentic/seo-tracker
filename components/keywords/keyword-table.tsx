import type { TrackedKeyword } from '@/types'

export function KeywordTable({ keywords }: { keywords: TrackedKeyword[] }) {
  return (
    <div className="overflow-x-auto rounded-md border bg-white">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
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
        <tbody className="divide-y">
          {keywords.map((k) => {
            const change = k.current_position != null && k.previous_position != null
              ? k.previous_position - k.current_position
              : null
            return (
              <tr key={k.id}>
                <td className="px-4 py-2 font-medium text-slate-900">{k.keyword}</td>
                <td className="px-4 py-2 text-slate-600">{k.monthly_volume ?? '—'}</td>
                <td className="px-4 py-2 text-slate-600">{k.keyword_difficulty ?? '—'}</td>
                <td className="px-4 py-2 text-slate-600">{k.current_position ?? '—'}</td>
                <td className={`px-4 py-2 ${change && change > 0 ? 'text-green-600' : change && change < 0 ? 'text-red-600' : 'text-slate-600'}`}>
                  {change === null ? '—' : change === 0 ? '—' : change > 0 ? `▲${change}` : `▼${Math.abs(change)}`}
                </td>
                <td className="px-4 py-2 text-slate-600">{k.target_url ?? '—'}</td>
                <td className="px-4 py-2 text-slate-600">{k.category ?? '—'}</td>
                <td className="px-4 py-2 text-slate-600">{k.priority ?? '—'}</td>
                <td className="px-4 py-2 text-slate-600">{k.cpc ? `$${k.cpc}` : '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
