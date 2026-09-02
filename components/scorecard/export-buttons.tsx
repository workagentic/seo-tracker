'use client'

import { buildScorecardRows, scorecardRowsToCsv } from '@/lib/scorecard'
import { Button } from '@/components/ui/button'
import type { MetricSnapshot, QuarterTarget } from '@/types'

export function ExportButtons({
  snapshot,
  target,
  quarterLabel,
  accountabilityMap,
}: {
  snapshot: MetricSnapshot | null
  target: QuarterTarget
  quarterLabel: string
  accountabilityMap: Record<string, string[]>
}) {
  function handleExportCsv() {
    const rows = buildScorecardRows(snapshot, target, accountabilityMap)
    const csv = scorecardRowsToCsv(rows, quarterLabel)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `scorecard-${quarterLabel.toLowerCase().replace(/\s+/g, '-')}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex gap-2 print:hidden">
      <Button variant="outline" size="sm" onClick={handleExportCsv}>Export CSV</Button>
      <Button variant="outline" size="sm" onClick={() => window.print()}>Export PDF</Button>
    </div>
  )
}
