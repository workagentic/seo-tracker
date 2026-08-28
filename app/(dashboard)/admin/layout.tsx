import { AdminTabs } from '@/components/admin/admin-tabs'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-foreground">Admin</h1>
      <AdminTabs />
      {children}
    </div>
  )
}
