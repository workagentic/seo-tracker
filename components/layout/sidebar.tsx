'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { Profile } from '@/types'

const NAV_ITEMS: { href: string; label: string; roles?: Profile['role'][] }[] = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/tasks', label: 'Tasks' },
  { href: '/scorecard', label: 'Scorecard' },
  { href: '/competitors', label: 'Competitors' },
  { href: '/keywords', label: 'Keywords' },
  { href: '/audit', label: 'Audit Reports' },
  { href: '/admin', label: 'Admin', roles: ['admin'] },
]

export function Sidebar({ role }: { role: Profile['role'] }) {
  const pathname = usePathname()
  const items = NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role))

  return (
    <nav className="flex h-full w-56 flex-col gap-1 border-r border-border bg-card p-4">
      <div className="mb-4 px-2 text-lg font-semibold text-foreground">EA SEO Tracker</div>
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
