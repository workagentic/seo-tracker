import { NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/auth'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'

// Shared upload endpoint for pasted screenshots on both task Comments and Notes (CLAUDE.md
// Section 14 follow-up, 3 Sep 2026) -- any authenticated profile can call it. The real
// permission gate is at the point of USE (posting the comment, saving notes), not here: an
// uploaded-but-never-attached image is just an orphaned file, not a security concern.
const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp'])
const EXTENSION_BY_TYPE: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
}

export async function POST(request: Request) {
  const profile = await getCurrentProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file is required' }, { status: 400 })
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: 'Only PNG, JPEG, GIF, or WebP images are allowed' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Image must be 5MB or smaller' }, { status: 400 })
  }

  const admin = createAdminSupabaseClient()
  const extension = EXTENSION_BY_TYPE[file.type]
  const path = `${profile.id}/${crypto.randomUUID()}.${extension}`

  const { error: uploadError } = await admin.storage
    .from('task-attachments')
    .upload(path, await file.arrayBuffer(), { contentType: file.type })
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data } = admin.storage.from('task-attachments').getPublicUrl(path)
  return NextResponse.json({ url: data.publicUrl })
}
