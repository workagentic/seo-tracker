import { getCurrentProfile } from '@/lib/auth'
import { AdminTabs } from '@/components/admin/admin-tabs'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile()

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-foreground">Admin</h1>
      <AdminTabs role={profile?.role ?? null} />
      {children}
    </div>
  )
}
