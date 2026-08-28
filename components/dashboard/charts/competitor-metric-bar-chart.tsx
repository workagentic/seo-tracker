'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer } from 'recharts'
import { CHART_COLORS } from '@/lib/chart-colors'

export interface CompetitorMetricRow {
  name: string
  value: number
  isEA: boolean
}

// One metric per chart (never dual-axis) since DR/traffic/keywords are wildly different
// scales — EA is highlighted in blue, every competitor in muted gray so identity reads as
// "us vs. them" rather than per-competitor hue (which wouldn't scale past a few competitors).
export function CompetitorMetricBarChart({ title, rows }: { title: string; rows: CompetitorMetricRow[] }) {
  const sorted = [...rows].sort((a, b) => b.value - a.value)

  return (
    <div>
      <h3 className="mb-2 text-sm font-medium text-foreground">{title}</h3>
      <ResponsiveContainer width="100%" height={Math.max(160, sorted.length * 32)}>
        <BarChart data={sorted} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
          <CartesianGrid stroke={CHART_COLORS.grid} horizontal={false} />
          <XAxis type="number" tick={{ fill: CHART_COLORS.textSecondary, fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: CHART_COLORS.textSecondary, fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={110}
          />
          <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e1e0d9', fontSize: 12 }} />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={18}>
            {sorted.map((row) => (
              <Cell key={row.name} fill={row.isEA ? CHART_COLORS.series1 : CHART_COLORS.muted} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
