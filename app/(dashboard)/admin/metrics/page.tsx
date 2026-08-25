import { ManualMetricForm } from '@/components/admin/manual-metric-form'

export default function AdminMetricsPage() {
  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-slate-900">Manual Metric Entry</h1>
      <ManualMetricForm />
    </div>
  )
}
