'use client'

import { useRouter, useSearchParams } from 'next/navigation'

const QUARTERS = ['baseline', 'Q1', 'Q2', 'Q3', 'Q4', 'Q5']

export function QuarterSelector({ current }: { current: string }) {
  const router = useRouter()
  const params = useSearchParams()

  return (
    <select
      value={current}
      onChange={(e) => {
        const next = new URLSearchParams(params.toString())
        next.set('quarter', e.target.value)
        router.push(`/scorecard?${next.toString()}`)
      }}
      className="rounded border border-input bg-card px-3 py-1.5 text-sm text-foreground"
    >
      {QUARTERS.map((q) => <option key={q} value={q}>{q === 'baseline' ? 'Baseline' : q}</option>)}
    </select>
  )
}
