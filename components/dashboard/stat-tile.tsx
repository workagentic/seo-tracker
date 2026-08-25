import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { calculateRAG } from '@/lib/rag'
import { RagBadge } from './rag-badge'
import type { RAGStatus } from '@/types'

const STATUS_BORDER: Record<RAGStatus, string> = {
  green: 'border-l-green-500',
  amber: 'border-l-amber-500',
  red: 'border-l-red-500',
  'no-data': 'border-l-border',
}

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
    <Card className={cn('border-l-4', STATUS_BORDER[status])}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline justify-between">
          <span className="font-mono text-2xl font-semibold text-foreground">
            {actual !== null ? fmt(actual) : '—'}
          </span>
          <RagBadge status={status} />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Target: <span className="font-mono">{fmt(target)}</span>
          {variance !== null && (
            <span className={cn('font-mono', variance >= 0 ? 'text-green-600' : 'text-red-600')}>
              {' '}({variance >= 0 ? '+' : ''}{variance.toFixed(1)}%)
            </span>
          )}
        </p>
      </CardContent>
    </Card>
  )
}
