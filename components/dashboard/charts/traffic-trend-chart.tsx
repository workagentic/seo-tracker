'use client'

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, ResponsiveContainer,
} from 'recharts'
import { CHART_COLORS } from '@/lib/chart-colors'

export interface TrafficTrendPoint {
  date: string
  global: number | null
  us: number | null
}

export function TrafficTrendChart({
  data,
  globalTarget,
  usTarget,
}: {
  data: TrafficTrendPoint[]
  globalTarget: number
  usTarget: number
}) {
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
        <YAxis tick={{ fill: CHART_COLORS.textSecondary, fontSize: 12 }} axisLine={false} tickLine={false} width={48} />
        <Tooltip
          contentStyle={{ borderRadius: 8, border: '1px solid #e1e0d9', fontSize: 12 }}
          labelStyle={{ fontWeight: 600 }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <ReferenceLine y={globalTarget} stroke={CHART_COLORS.series1} strokeDasharray="4 4" strokeOpacity={0.5} label={{ value: 'Global target', fontSize: 10, fill: CHART_COLORS.series1, position: 'insideTopLeft' }} />
        <ReferenceLine y={usTarget} stroke={CHART_COLORS.series2} strokeDasharray="4 4" strokeOpacity={0.5} label={{ value: 'US target', fontSize: 10, fill: CHART_COLORS.series2, position: 'insideBottomLeft' }} />
        <Line type="monotone" dataKey="global" name="Organic Traffic (Global)" stroke={CHART_COLORS.series1} strokeWidth={2} dot={{ r: 3 }} connectNulls />
        <Line type="monotone" dataKey="us" name="Organic Traffic (US)" stroke={CHART_COLORS.series2} strokeWidth={2} dot={{ r: 3 }} connectNulls />
      </LineChart>
    </ResponsiveContainer>
  )
}
