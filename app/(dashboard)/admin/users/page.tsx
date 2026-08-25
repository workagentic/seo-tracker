import { createServerSupabaseClient } from '@/lib/supabase/server'
import { CreateUserForm } from '@/components/admin/create-user-form'
import type { Profile } from '@/types'

export default async function AdminUsersPage() {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase.from('profiles').select('*').order('full_name')

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-foreground">Users</h1>
      <CreateUserForm />
      <div className="overflow-hidden rounded-md border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs font-medium uppercase text-muted-foreground">
            <tr><th className="px-4 py-2">Name</th><th className="px-4 py-2">Role</th><th className="px-4 py-2">Job title</th><th className="px-4 py-2">Active</th></tr>
          </thead>
          <tbody className="divide-y divide-border">
            {((data as Profile[]) ?? []).map((p) => (
              <tr key={p.id} className="hover:bg-muted/50">
                <td className="px-4 py-2 text-foreground">{p.full_name}</td>
                <td className="px-4 py-2 text-muted-foreground">{p.role}</td>
                <td className="px-4 py-2 text-muted-foreground">{p.job_title ?? '—'}</td>
                <td className="px-4 py-2 text-muted-foreground">{p.is_active ? 'Yes' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
