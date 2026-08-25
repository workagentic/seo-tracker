import Link from 'next/link'
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
  const items = NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role))
  return (
    <nav className="flex h-full w-56 flex-col gap-1 border-r bg-white p-4">
      <div className="mb-4 px-2 text-lg font-semibold text-slate-900">EA SEO Tracker</div>
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  )
}
