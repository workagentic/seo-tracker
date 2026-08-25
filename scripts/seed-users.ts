import { createClient } from '@supabase/supabase-js'
import { TEAM_MEMBERS } from '../lib/constants'

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running this script')
  }
  const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

  for (const member of TEAM_MEMBERS) {
    const email = `${member.full_name.toLowerCase().replace(/\s+/g, '.')}@eaccelerated.com`
    const tempPassword = crypto.randomUUID()

    const { data: created, error } = await admin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
    })
    if (error) {
      console.error(`Failed to create ${email}:`, error.message)
      continue
    }

    const { error: profileError } = await admin.from('profiles').insert({
      id: created.user.id,
      full_name: member.full_name,
      role: member.role,
      job_title: member.job_title,
    })
    if (profileError) {
      console.error(`Failed to create profile for ${email}:`, profileError.message)
      continue
    }

    console.log(`Created ${email} (role: ${member.role}) — temp password: ${tempPassword}`)
  }
}

main().then(() => process.exit(0))
