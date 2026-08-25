import { createServerSupabaseClient } from '@/lib/supabase/server'
import { CreateUserForm } from '@/components/admin/create-user-form'
import type { Profile } from '@/types'

export default async function AdminUsersPage() {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase.from('profiles').select('*').order('full_name')

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Users</h1>
      <CreateUserForm />
      <div className="overflow-hidden rounded-md border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
            <tr><th className="px-4 py-2">Name</th><th className="px-4 py-2">Role</th><th className="px-4 py-2">Job title</th><th className="px-4 py-2">Active</th></tr>
          </thead>
          <tbody className="divide-y">
            {((data as Profile[]) ?? []).map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-2 text-slate-900">{p.full_name}</td>
                <td className="px-4 py-2 text-slate-600">{p.role}</td>
                <td className="px-4 py-2 text-slate-600">{p.job_title ?? '—'}</td>
                <td className="px-4 py-2 text-slate-600">{p.is_active ? 'Yes' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
