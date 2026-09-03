import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/auth'
import { KeywordTable } from '@/components/keywords/keyword-table'
import { CsvImportDialog } from '@/components/keywords/csv-import-dialog'
import { SyncButton } from '@/components/dashboard/sync-button'
import type { TrackedKeyword } from '@/types'

export default async function KeywordsPage() {
  const profile = await getCurrentProfile()
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase.from('tracked_keywords').select('*').eq('is_active', true).order('keyword')

  const canSync = profile && ['admin', 'senior'].includes(profile.role)

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Keyword Rank Tracker</h1>
        <div className="flex items-center gap-2">
          {canSync && <SyncButton endpoint="/api/sync/gsc" label="Refresh from GSC" />}
          {canSync && <CsvImportDialog />}
        </div>
      </div>
      <KeywordTable keywords={(data as TrackedKeyword[]) ?? []} />
    </div>
  )
}
