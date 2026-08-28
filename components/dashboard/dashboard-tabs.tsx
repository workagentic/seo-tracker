'use client'

import { useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

const TABS = [
  { key: 'targets', label: 'Targets' },
  { key: 'trends', label: 'Trends' },
  { key: 'competitors', label: 'Competitor Comparison' },
  { key: 'ga4', label: 'Web Analytics (GA4)' },
  { key: 'clarity', label: 'Clarity' },
] as const

type TabKey = (typeof TABS)[number]['key']

export function DashboardTabs({
  targets,
  trends,
  competitors,
  ga4,
  clarity,
}: Record<TabKey, ReactNode>) {
  const [active, setActive] = useState<TabKey>('targets')
  const sections: Record<TabKey, ReactNode> = { targets, trends, competitors, ga4, clarity }

  return (
    <div>
      <nav className="mb-4 flex gap-1 border-b border-border">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActive(tab.key)}
            className={cn(
              'border-b-2 px-4 py-2 text-sm font-medium transition-colors',
              active === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      {sections[active]}
    </div>
  )
}
