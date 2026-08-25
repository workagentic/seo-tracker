import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { calculateRAG } from '@/lib/rag'
import { RagBadge } from './rag-badge'

export function StatTile({
  label,
  actual,
  target,
  format,
}: {
  label: string
  actual: number | null
  target: number
  format?: (n: number) => string
}) {
  const status = calculateRAG(actual, target)
  const fmt = format ?? ((n: number) => n.toLocaleString())
  const variance = actual !== null ? ((actual - target) / target) * 100 : null

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-slate-500">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-semibold text-slate-900">
            {actual !== null ? fmt(actual) : '—'}
          </span>
          <RagBadge status={status} />
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Target: {fmt(target)}
          {variance !== null && (
            <span className={variance >= 0 ? ' text-green-600' : ' text-red-600'}>
              {' '}({variance >= 0 ? '+' : ''}{variance.toFixed(1)}%)
            </span>
          )}
        </p>
      </CardContent>
    </Card>
  )
}
