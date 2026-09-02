import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getAppSettings } from '@/lib/settings'
import { getCalendarQuarter, getCurrentQuarter } from '@/lib/constants'
import { SettingsForm } from '@/components/admin/settings-form'

const CALENDAR_QUARTERS = [
  { label: 'Q1', months: 'Jan – Mar' },
  { label: 'Q2', months: 'Apr – Jun' },
  { label: 'Q3', months: 'Jul – Sep' },
  { label: 'Q4', months: 'Oct – Dec' },
]

export default async function AdminSettingsPage() {
  const supabase = await createServerSupabaseClient()
  const settings = await getAppSettings(supabase)
  const now = new Date()
  const current = getCalendarQuarter(now)

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-foreground">Settings</h1>
      <SettingsForm settings={settings} />
      <div className="max-w-md space-y-2 rounded-md border border-border bg-card p-4">
        <h2 className="font-medium text-foreground">Quarter boundaries</h2>
        <p className="text-xs text-muted-foreground">
          Standard calendar quarters, computed automatically for any year (lib/constants.ts
          getCurrentQuarter) per CLAUDE.md Section 14 Phase 1 — nothing to extend here.
          Current quarter: <span className="font-medium text-foreground">{getCurrentQuarter(now)}</span>.
        </p>
        <table className="w-full text-sm">
          <tbody className="divide-y divide-border">
            {CALENDAR_QUARTERS.map((q) => (
              <tr key={q.label}>
                <td className="py-1 text-foreground">
                  {q.label}
                  {q.label === `Q${current.quarterNumber}` && (
                    <span className="ml-2 text-xs text-primary">(current)</span>
                  )}
                </td>
                <td className="py-1 text-muted-foreground">{q.months}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
