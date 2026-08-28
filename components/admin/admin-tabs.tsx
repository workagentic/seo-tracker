'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const ADMIN_TABS = [
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/metrics', label: 'Metrics' },
  { href: '/admin/sync', label: 'Sync' },
  { href: '/admin/settings', label: 'Settings' },
]

export function AdminTabs() {
  const pathname = usePathname()

  return (
    <nav className="mb-4 flex gap-1 border-b border-border">
      {ADMIN_TABS.map((tab) => {
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
