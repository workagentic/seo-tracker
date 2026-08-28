import { redirect } from 'next/navigation'
import { getCurrentProfile } from '@/lib/auth'
import { Sidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')

  return (
    <div className="flex h-screen min-w-[1024px] print:block print:h-auto">
      <div className="print:hidden">
        <Sidebar role={profile.role} />
      </div>
      <div className="flex flex-1 flex-col overflow-hidden print:block print:overflow-visible">
        <div className="print:hidden">
          <Topbar profile={profile} />
        </div>
        <main className="flex-1 overflow-y-auto bg-background p-6 print:overflow-visible print:p-0">{children}</main>
      </div>
    </div>
  )
}
