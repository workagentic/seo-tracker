import Link from 'next/link'

export default function AdminHubPage() {
  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-slate-900">Admin</h1>
      <div className="flex gap-4">
        <Link href="/admin/users" className="rounded-md border bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
          Users
        </Link>
        <Link href="/admin/metrics" className="rounded-md border bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
          Manual metric entry
        </Link>
      </div>
    </div>
  )
}
