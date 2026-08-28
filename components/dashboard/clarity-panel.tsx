import type { ClaritySnapshot } from '@/types'

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono font-medium text-foreground">{value}</span>
    </div>
  )
}

// Clarity's own bot detection (totalBotSessionCount) — flagging this prominently rather
// than letting an inflated-looking session count go unquestioned, same class of issue as
// a GA4 spam-traffic finding seen on another project's Search Console cross-check.
const BOT_WARNING_THRESHOLD = 0.5

export function ClarityPanel({ snapshot }: { snapshot: ClaritySnapshot | null }) {
  if (!snapshot) {
    return <p className="text-sm text-muted-foreground">No Clarity data yet — click Sync Clarity to pull the last 3 days.</p>
  }

  const total = snapshot.total_sessions ?? 0
  const bot = snapshot.bot_sessions ?? 0
  const botPct = total > 0 ? bot / total : 0
  const realSessions = Math.max(total - bot, 0)

  return (
    <div>
      {botPct >= BOT_WARNING_THRESHOLD && total > 0 && (
        <div className="mb-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <strong>{(botPct * 100).toFixed(0)}% of sessions flagged as bot traffic</strong> by
          Clarity ({bot} of {total}) — only ~{realSessions} look like real visitors in this
          window. Treat the numbers below as directional, not a real-traffic count.
        </div>
      )}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <h3 className="mb-1 text-sm font-medium text-foreground">Sessions (last 3 days)</h3>
          <MetricRow label="Total Sessions" value={total.toLocaleString()} />
          <MetricRow label="Flagged as Bot" value={bot.toLocaleString()} />
          <MetricRow label="Distinct Users" value={(snapshot.distinct_users ?? 0).toLocaleString()} />
          <MetricRow label="Avg. Scroll Depth" value={`${(snapshot.avg_scroll_depth ?? 0).toFixed(0)}%`} />
        </div>
        <div>
          <h3 className="mb-1 text-sm font-medium text-foreground">Engagement Issues</h3>
          <MetricRow label="Dead Clicks" value={(snapshot.dead_click_count ?? 0).toLocaleString()} />
          <MetricRow label="Rage Clicks" value={(snapshot.rage_click_count ?? 0).toLocaleString()} />
          <MetricRow label="Script Errors" value={(snapshot.script_error_count ?? 0).toLocaleString()} />
        </div>
      </div>
      {snapshot.top_pages && snapshot.top_pages.length > 0 && (
        <div className="mt-4">
          <h3 className="mb-1 text-sm font-medium text-foreground">Top Pages</h3>
          <ul className="space-y-1 text-sm">
            {snapshot.top_pages.map((p) => (
              <li key={p.url} className="flex items-center justify-between">
                <span className="truncate text-muted-foreground">{p.url}</span>
                <span className="ml-2 shrink-0 font-mono text-foreground">{p.visits}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="mt-3 text-xs text-muted-foreground">
        Last synced: {new Date(snapshot.created_at).toLocaleString()} · Clarity only reports a
        trailing 3-day window on this plan
      </p>
    </div>
  )
}
