import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { AuditReport } from '@/types'

const SEVERITY_STYLES: Record<string, string> = {
  critical: 'bg-red-100 text-red-800',
  high: 'bg-orange-100 text-orange-800',
  medium: 'bg-amber-100 text-amber-800',
  low: 'bg-slate-100 text-slate-700',
}

export function AuditCard({ report }: { report: AuditReport }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-base">{report.title}</CardTitle>
          <p className="text-xs text-slate-500">{report.category} · assigned to {report.assigned_profile?.full_name ?? 'unassigned'}</p>
        </div>
        <div className="flex gap-2">
          {report.severity && <Badge className={SEVERITY_STYLES[report.severity]}>{report.severity}</Badge>}
          <Badge variant="outline">{report.status.replace('_', ' ')}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-1 text-sm">
        <p className="text-slate-700">{report.finding}</p>
        {report.recommendation && <p className="text-slate-500">Recommendation: {report.recommendation}</p>}
      </CardContent>
    </Card>
  )
}
