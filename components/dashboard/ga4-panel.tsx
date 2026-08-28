import type { Ga4Snapshot } from '@/types'

function formatDuration(seconds: number | null): string {
  if (seconds === null) return '—'
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return `${m}m ${s}s`
}

function formatPercent(v: number | null): string {
  if (v === null) return '—'
  return `${(v * 100).toFixed(1)}%`
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono font-medium text-foreground">{value}</span>
    </div>
  )
}

function Ga4Column({
  title,
  sessions,
  users,
  newUsers,
  bounceRate,
  avgDuration,
}: {
  title: string
  sessions: number | null
  users: number | null
  newUsers: number | null
  bounceRate: number | null
  avgDuration: number | null
}) {
  return (
    <div>
      <h3 className="mb-1 text-sm font-medium text-foreground">{title}</h3>
      <MetricRow label="Sessions" value={sessions?.toLocaleString() ?? '—'} />
      <MetricRow label="Users" value={users?.toLocaleString() ?? '—'} />
      <MetricRow label="New Users" value={newUsers?.toLocaleString() ?? '—'} />
      <MetricRow label="Bounce Rate" value={formatPercent(bounceRate)} />
      <MetricRow label="Avg. Session Duration" value={formatDuration(avgDuration)} />
    </div>
  )
}

export function Ga4Panel({ snapshot }: { snapshot: Ga4Snapshot | null }) {
  if (!snapshot) {
    return <p className="text-sm text-muted-foreground">No GA4 data yet — click Sync GA4 to pull the last 28 days.</p>
  }

  return (
    <div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Ga4Column
          title="Global (last 28 days)"
          sessions={snapshot.sessions_global}
          users={snapshot.users_global}
          newUsers={snapshot.new_users_global}
          bounceRate={snapshot.bounce_rate_global}
          avgDuration={snapshot.avg_session_duration_global}
        />
        <Ga4Column
          title="US (last 28 days)"
          sessions={snapshot.sessions_us}
          users={snapshot.users_us}
          newUsers={snapshot.new_users_us}
          bounceRate={snapshot.bounce_rate_us}
          avgDuration={snapshot.avg_session_duration_us}
        />
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Last synced: {new Date(snapshot.created_at).toLocaleString()}
      </p>
    </div>
  )
}
