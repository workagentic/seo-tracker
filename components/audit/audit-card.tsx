import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { AuditReport } from '@/types'

const SEVERITY_STYLES: Record<string, string> = {
  critical: 'bg-red-100 text-red-800',
  high: 'bg-orange-100 text-orange-800',
  medium: 'bg-amber-100 text-amber-800',
  low: 'bg-muted text-foreground',
}

const SEVERITY_BORDER: Record<string, string> = {
  critical: 'border-l-red-500',
  high: 'border-l-orange-500',
  medium: 'border-l-amber-500',
  low: 'border-l-border',
}

export function AuditCard({ report }: { report: AuditReport }) {
  return (
    <Card className={cn('border-l-4', report.severity ? SEVERITY_BORDER[report.severity] : 'border-l-border')}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-base">{report.title}</CardTitle>
          <p className="text-xs text-muted-foreground">{report.category} · assigned to {report.assigned_profile?.full_name ?? 'unassigned'}</p>
        </div>
        <div className="flex gap-2">
          {report.severity && <Badge className={SEVERITY_STYLES[report.severity]}>{report.severity}</Badge>}
          <Badge variant="outline">{report.status.replace('_', ' ')}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-1 text-sm">
        <p className="text-foreground">{report.finding}</p>
        {report.recommendation && <p className="text-muted-foreground">Recommendation: {report.recommendation}</p>}
      </CardContent>
    </Card>
  )
}
