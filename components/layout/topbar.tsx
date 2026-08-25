import type { Profile } from '@/types'
import { SignOutButton } from './sign-out-button'

export function Topbar({ profile }: { profile: Profile }) {
  return (
    <header className="flex h-14 items-center justify-between border-b bg-white px-6">
      <div className="text-sm text-slate-500">Signed in as {profile.full_name} · {profile.role}</div>
      <SignOutButton />
    </header>
  )
}
