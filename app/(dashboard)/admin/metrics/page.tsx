import { ManualMetricForm } from '@/components/admin/manual-metric-form'

export default function AdminMetricsPage() {
  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-foreground">Manual Metric Entry</h1>
      <ManualMetricForm />
    </div>
  )
}
