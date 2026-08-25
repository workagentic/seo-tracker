import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getAppSettings } from '@/lib/settings'
import { QUARTER_BOUNDARIES } from '@/lib/constants'
import { SettingsForm } from '@/components/admin/settings-form'

export default async function AdminSettingsPage() {
  const supabase = await createServerSupabaseClient()
  const settings = await getAppSettings(supabase)

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-foreground">Settings</h1>
      <SettingsForm settings={settings} />
      <div className="max-w-md space-y-2 rounded-md border border-border bg-card p-4">
        <h2 className="font-medium text-foreground">Quarter boundaries</h2>
        <p className="text-xs text-muted-foreground">
          Defined in code (lib/constants.ts QUARTER_BOUNDARIES) per CLAUDE.md Section 9.3, not
          editable here — extend the array there to add a new quarter.
        </p>
        <table className="w-full text-sm">
          <tbody className="divide-y divide-border">
            {QUARTER_BOUNDARIES.map((q) => (
              <tr key={q.label}>
                <td className="py-1 text-foreground">{q.label}</td>
                <td className="py-1 text-muted-foreground">{q.start}</td>
                <td className="py-1 text-muted-foreground">{q.end}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
