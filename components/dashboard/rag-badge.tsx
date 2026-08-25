import type { RAGStatus } from '@/types'
import { Badge } from '@/components/ui/badge'

const STYLES: Record<RAGStatus, string> = {
  green: 'bg-green-100 text-green-800 hover:bg-green-100',
  amber: 'bg-amber-100 text-amber-800 hover:bg-amber-100',
  red: 'bg-red-100 text-red-800 hover:bg-red-100',
  'no-data': 'bg-muted text-muted-foreground hover:bg-muted',
}

const LABELS: Record<RAGStatus, string> = {
  green: 'On track', amber: 'At risk', red: 'Off track', 'no-data': 'No data',
}

export function RagBadge({ status }: { status: RAGStatus }) {
  return <Badge className={STYLES[status]}>{LABELS[status]}</Badge>
}
