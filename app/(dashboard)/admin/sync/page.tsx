import { createServerSupabaseClient } from '@/lib/supabase/server'
import { SyncButton } from '@/components/dashboard/sync-button'
import type { SyncLog } from '@/types'

export default async function AdminSyncPage() {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('sync_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)
  const logs = (data as SyncLog[]) ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Sync</h1>
        <SyncButton />
      </div>
      <p className="text-sm text-muted-foreground">
        GSC, GA4, and Clarity syncs are v2 scope (CLAUDE.md Section 12) — only Ahrefs is wired up.
      </p>
      <div className="overflow-hidden rounded-md border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs font-medium uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-2">When</th>
              <th className="px-4 py-2">Source</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Message</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {logs.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">No syncs logged yet.</td></tr>
            )}
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-muted/50">
                <td className="px-4 py-2 text-muted-foreground">{new Date(log.created_at).toLocaleString()}</td>
                <td className="px-4 py-2 text-foreground">{log.source}</td>
                <td className="px-4 py-2">
                  <span className={log.status === 'success' ? 'text-emerald-600' : 'text-destructive'}>
                    {log.status}
                  </span>
                </td>
                <td className="px-4 py-2 text-muted-foreground">{log.message ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
