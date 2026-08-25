import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { Profile } from '@/types'

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  return (data as unknown as Profile) ?? null
}
