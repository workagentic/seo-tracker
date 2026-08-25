import { redirect } from 'next/navigation'
import { getCurrentProfile } from '@/lib/auth'
import { Sidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')

  return (
    <div className="flex h-screen min-w-[1024px]">
      <Sidebar role={profile.role} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar profile={profile} />
        <main className="flex-1 overflow-y-auto bg-slate-50 p-6">{children}</main>
      </div>
    </div>
  )
}
