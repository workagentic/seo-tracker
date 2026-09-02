import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/auth'
import { CreateUserForm } from '@/components/admin/create-user-form'
import { UserRow } from '@/components/admin/user-row'
import type { Profile } from '@/types'

export default async function AdminUsersPage() {
  const supabase = await createServerSupabaseClient()
  const [{ data }, currentProfile] = await Promise.all([
    supabase.from('profiles').select('*').order('full_name'),
    getCurrentProfile(),
  ])

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-foreground">Users</h1>
      <CreateUserForm />
      <div className="overflow-hidden rounded-md border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs font-medium uppercase text-muted-foreground">
            <tr><th className="px-4 py-2">Name</th><th className="px-4 py-2">Role</th><th className="px-4 py-2">Job title</th><th className="px-4 py-2">Active</th><th className="px-4 py-2" /></tr>
          </thead>
          <tbody className="divide-y divide-border">
            {((data as Profile[]) ?? []).map((p) => (
              <UserRow key={p.id} profile={p} currentUserId={currentProfile?.id ?? ''} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
