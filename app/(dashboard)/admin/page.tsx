import { redirect } from 'next/navigation'
import { getCurrentProfile } from '@/lib/auth'

export default async function AdminHubPage() {
  const profile = await getCurrentProfile()
  // Senior can't reach /admin/users (CLAUDE.md Section 14) -- land there on /admin/sync
  // instead of bouncing through a page middleware would immediately redirect away from.
  redirect(profile?.role === 'admin' ? '/admin/users' : '/admin/sync')
}
