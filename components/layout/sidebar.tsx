'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { Profile } from '@/types'

// Reviewer (Adeela) is restricted to only Tasks (CLAUDE.md Section 14, migration
// 0028_role_rename.sql) -- every other item is explicitly admin/senior/expert so it's hidden
// for reviewer, rather than Tasks alone needing a reviewer-specific carve-out. middleware.ts
// enforces this at the route level too; this list is just what the sidebar shows.
const STANDARD_ROLES: Profile['role'][] = ['admin', 'senior', 'expert']

const NAV_ITEMS: { href: string; label: string; roles?: Profile['role'][] }[] = [
  { href: '/dashboard', label: 'Dashboard', roles: STANDARD_ROLES },
  { href: '/tasks', label: 'Tasks' },
  { href: '/scorecard', label: 'Scorecard', roles: STANDARD_ROLES },
  { href: '/weekly-report', label: 'Weekly Report', roles: STANDARD_ROLES },
  { href: '/competitors', label: 'Competitors', roles: STANDARD_ROLES },
  { href: '/keywords', label: 'Keywords', roles: STANDARD_ROLES },
  { href: '/audit', label: 'Audit Reports', roles: STANDARD_ROLES },
  { href: '/leads', label: 'Leads', roles: ['admin'] },
  { href: '/admin', label: 'Admin', roles: ['admin', 'senior'] },
]

export function Sidebar({ role }: { role: Profile['role'] }) {
  const pathname = usePathname()
  const items = NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role))

  return (
    <nav className="flex h-full w-56 flex-col gap-1 border-r border-border bg-card p-4">
      <div className="mb-4 px-2 text-lg font-semibold text-foreground">EA Marketing Tracker</div>
      {items.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'rounded-md px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            )}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
