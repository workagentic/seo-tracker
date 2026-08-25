'use client'

import { createBrowserSupabaseClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export function SignOutButton() {
  const router = useRouter()
  const supabase = createBrowserSupabaseClient()
  return (
    <button
      onClick={async () => {
        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
      }}
      className="text-sm text-muted-foreground hover:text-foreground"
    >
      Sign out
    </button>
  )
}
