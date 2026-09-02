import { createServerSupabaseClient } from '@/lib/supabase/server'
import { TaskCategoryForm } from '@/components/admin/task-category-form'
import { TaskCategoryRow } from '@/components/admin/task-category-row'
import type { TaskCategory } from '@/types'

export default async function AdminTaskCategoriesPage() {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase.from('task_categories').select('*').order('name')

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-foreground">Task Categories</h1>
      <TaskCategoryForm />
      <div className="overflow-hidden rounded-md border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs font-medium uppercase text-muted-foreground">
            <tr><th className="px-4 py-2">Name</th><th className="px-4 py-2" /></tr>
          </thead>
          <tbody className="divide-y divide-border">
            {((data as TaskCategory[]) ?? []).map((c) => (
              <TaskCategoryRow key={c.id} category={c} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
