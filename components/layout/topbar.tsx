import type { Profile } from '@/types'
import { SignOutButton } from './sign-out-button'
import { NotificationBell } from './notification-bell'

export function Topbar({ profile }: { profile: Profile }) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card px-6">
      <div className="text-sm text-muted-foreground">
        Signed in as <span className="font-medium text-foreground">{profile.full_name}</span> · {profile.role}
      </div>
      <div className="flex items-center gap-2">
        <NotificationBell />
        <SignOutButton />
      </div>
    </header>
  )
}
