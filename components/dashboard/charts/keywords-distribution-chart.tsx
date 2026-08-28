'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer } from 'recharts'
import { CHART_COLORS } from '@/lib/chart-colors'

export function KeywordsDistributionChart({
  top3,
  top4to10,
}: {
  top3: number | null
  top4to10: number | null
}) {
  const data = [
    { band: 'Top 3', count: top3 ?? 0 },
    { band: 'Positions 4–10', count: top4to10 ?? 0 },
  ]

  return (
    <div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
          <XAxis dataKey="band" tick={{ fill: CHART_COLORS.textSecondary, fontSize: 12 }} axisLine={{ stroke: CHART_COLORS.axis }} tickLine={false} />
          <YAxis tick={{ fill: CHART_COLORS.textSecondary, fontSize: 12 }} axisLine={false} tickLine={false} width={32} allowDecimals={false} />
          <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e1e0d9', fontSize: 12 }} />
          <Bar dataKey="count" name="Keywords" radius={[4, 4, 0, 0]} maxBarSize={64}>
            {data.map((d) => <Cell key={d.band} fill={CHART_COLORS.series1} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="mt-1 text-center text-xs text-muted-foreground">
        Positions 11–20 aren&apos;t tracked yet — Ahrefs sync only captures Top 3 and Top 10 counts.
      </p>
    </div>
  )
}
