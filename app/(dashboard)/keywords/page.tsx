import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/auth'
import { KeywordTable } from '@/components/keywords/keyword-table'
import { CsvImportDialog } from '@/components/keywords/csv-import-dialog'
import type { TrackedKeyword } from '@/types'

export default async function KeywordsPage() {
  const profile = await getCurrentProfile()
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase.from('tracked_keywords').select('*').eq('is_active', true).order('keyword')

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Keyword Rank Tracker</h1>
        {profile && ['admin', 'head'].includes(profile.role) && <CsvImportDialog />}
      </div>
      <KeywordTable keywords={(data as TrackedKeyword[]) ?? []} />
    </div>
  )
}
