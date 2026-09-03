'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { Role } from '@/types'

const ADMIN_TABS: { href: string; label: string; adminOnly?: boolean }[] = [
  { href: '/admin/users', label: 'Users', adminOnly: true },
  { href: '/admin/metrics', label: 'Metrics' },
  { href: '/admin/sync', label: 'Sync' },
  { href: '/admin/settings', label: 'Settings' },
  { href: '/admin/lead-sources', label: 'Lead Sources' },
  { href: '/admin/task-categories', label: 'Task Categories' },
]

// Senior gets every /admin/* sub-page except Users (CLAUDE.md Section 14) -- middleware.ts
// enforces this at the route level; this just keeps the tab out of senior's way.
export function AdminTabs({ role }: { role: Role | null }) {
  const pathname = usePathname()
  const tabs = ADMIN_TABS.filter((tab) => !tab.adminOnly || role === 'admin')

  return (
    <nav className="mb-4 flex gap-1 border-b border-border">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href || pathname.startsWith(`${tab.href}/`)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'border-b-2 px-4 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
