'use client'

import { useRouter } from 'next/navigation'
import type { Competitor } from '@/types'
import { Button } from '@/components/ui/button'

export function CompetitorTable({ competitors, isAdmin }: { competitors: Competitor[]; isAdmin: boolean }) {
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
          {competitors.map((c) => (
            <tr key={c.id} className="hover:bg-muted/50">
              <td className="px-4 py-2 font-medium text-foreground">{c.company_name}</td>
              <td className="px-4 py-2 text-muted-foreground">{c.domain}</td>
              <td className="px-4 py-2 font-mono text-muted-foreground">{c.domain_rating ?? '—'}</td>
              <td className="px-4 py-2 font-mono text-muted-foreground">{c.organic_traffic ?? '—'}</td>
              <td className="px-4 py-2 font-mono text-muted-foreground">{c.organic_keywords ?? '—'}</td>
              <td className="px-4 py-2 font-mono text-muted-foreground">{c.keywords_top_3 ?? '—'}</td>
              <td className="px-4 py-2 font-mono text-muted-foreground">{c.est_traffic_value ? `$${c.est_traffic_value.toLocaleString()}` : '—'}</td>
              <td className="px-4 py-2 font-mono text-muted-foreground">{c.referring_domains ?? '—'}</td>
              <td className="px-4 py-2 font-mono text-muted-foreground">{c.last_synced_at ? new Date(c.last_synced_at).toLocaleDateString() : 'never'}</td>
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
          ))}
        </tbody>
      </table>
    </div>
  )
}
