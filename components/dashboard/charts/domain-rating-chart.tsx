'use client'

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts'
import { CHART_COLORS } from '@/lib/chart-colors'

export interface DrPoint {
  date: string
  domain_rating: number | null
}

export function DomainRatingChart({ data, target }: { data: DrPoint[]; target: number }) {
  if (data.length === 0) {
    return <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">No snapshot history yet.</div>
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fill: CHART_COLORS.textSecondary, fontSize: 12 }}
          axisLine={{ stroke: CHART_COLORS.axis }}
          tickLine={false}
        />
        <YAxis tick={{ fill: CHART_COLORS.textSecondary, fontSize: 12 }} axisLine={false} tickLine={false} width={32} />
        <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e1e0d9', fontSize: 12 }} labelStyle={{ fontWeight: 600 }} />
        <ReferenceLine
          y={target}
          stroke={CHART_COLORS.muted}
          strokeDasharray="4 4"
          label={{ value: `Current quarter target (${target})`, fontSize: 10, fill: CHART_COLORS.muted, position: 'insideTopLeft' }}
        />
        <Line type="monotone" dataKey="domain_rating" name="Domain Rating" stroke={CHART_COLORS.series1} strokeWidth={2} dot={{ r: 3 }} connectNulls />
      </LineChart>
    </ResponsiveContainer>
  )
}
