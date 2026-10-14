import { NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/auth'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { ELIGIBLE_OWNER_NAMES } from '@/lib/tasks/constants'
import { parseWorkbook, validateImportRow, type NameRef, type TaskImportPayload } from '@/lib/tasks/excel-import'

export async function POST(request: Request) {
  const profile = await getCurrentProfile()
  if (!profile || !['admin', 'senior'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const formData = await request.formData()
  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  let rows
  try {
    rows = parseWorkbook(buffer)
  } catch {
    return NextResponse.json({ error: 'Could not read this file — make sure it\'s a valid .xlsx spreadsheet' }, { status: 400 })
  }

  if (rows.length === 0) {
    return NextResponse.json({ error: 'The file has no rows to import' }, { status: 400 })
  }

  const admin = createAdminSupabaseClient()
  const [{ data: allProfiles }, { data: allCategories }] = await Promise.all([
    admin.from('profiles').select('id, full_name'),
    admin.from('task_categories').select('id, name'),
  ])

  const profiles: NameRef[] = ((allProfiles as { id: string; full_name: string }[]) ?? []).map((p) => ({
    id: p.id,
    name: p.full_name,
  }))
  const eligibleOwners = profiles.filter((p) => (ELIGIBLE_OWNER_NAMES as readonly string[]).includes(p.name))
  const categories: NameRef[] = ((allCategories as { id: string; name: string }[]) ?? []).map((c) => ({
    id: c.id,
    name: c.name,
  }))

  const skipped: { row: number; reason: string }[] = []
  const toInsert: TaskImportPayload[] = []

  rows.forEach((row, i) => {
    const result = validateImportRow(row, { eligibleOwners, profiles, categories })
    if (result.ok) {
      toInsert.push(result.task)
    } else {
      // +2: 1-indexed, plus the header row itself, so this matches the row number the
      // uploader would see counting lines in their spreadsheet.
      skipped.push({ row: i + 2, reason: result.reason })
    }
  })

  let imported = 0
  if (toInsert.length > 0) {
    const { data, error } = await admin.from('tasks').insert(toInsert as never).select('id')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    imported = data?.length ?? 0
  }

  return NextResponse.json({ imported, skipped })
}
