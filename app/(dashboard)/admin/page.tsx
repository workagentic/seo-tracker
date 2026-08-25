import Link from 'next/link'

export default function AdminHubPage() {
  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-foreground">Admin</h1>
      <div className="flex gap-4">
        <Link href="/admin/users" className="rounded-md border border-border bg-card px-4 py-3 text-sm font-medium text-foreground hover:bg-muted">
          Users
        </Link>
        <Link href="/admin/metrics" className="rounded-md border border-border bg-card px-4 py-3 text-sm font-medium text-foreground hover:bg-muted">
          Manual metric entry
        </Link>
        <Link href="/admin/sync" className="rounded-md border border-border bg-card px-4 py-3 text-sm font-medium text-foreground hover:bg-muted">
          Sync
        </Link>
        <Link href="/admin/settings" className="rounded-md border border-border bg-card px-4 py-3 text-sm font-medium text-foreground hover:bg-muted">
          Settings
        </Link>
      </div>
    </div>
  )
}
