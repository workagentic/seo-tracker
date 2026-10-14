import * as XLSX from 'xlsx'
import { ELIGIBLE_OWNER_NAMES } from './constants'

export interface RawImportRow {
  'Action Number'?: string
  'Title'?: string
  'Description'?: string
  'Owner'?: string
  'Assigned To'?: string
  'Due Date'?: string | Date
  'Deadline'?: string | Date
  'Quarter'?: string
  'Category'?: string
  'Notes'?: string
  'Link URL'?: string
}

// Reads the first sheet of an uploaded .xlsx file into plain row objects keyed by header. A
// throw here (corrupt file, not actually an Excel file) is deliberately left to propagate --
// the route treats it as "nothing parseable to import."
export function parseWorkbook(buffer: Buffer): RawImportRow[] {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true })
  const firstSheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[firstSheetName]
  return XLSX.utils.sheet_to_json<RawImportRow>(sheet, { defval: '' })
}

// Excel cells come through as a JS Date when the cell is date-formatted (cellDates: true), or
// as plain text otherwise -- a spreadsheet user typing "2026-10-16" into an unformatted cell
// is just as valid as picking a date in a formatted one.
function normalizeDate(value: string | Date | undefined): string | null {
  if (!value) return null
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null
    return value.toISOString().slice(0, 10)
  }
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = new Date(trimmed)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString().slice(0, 10)
}

const QUARTERS = new Set(['Q1', 'Q2', 'Q3', 'Q4'])

function normalizeQuarter(value: string | undefined): string | null {
  const upper = value?.trim().toUpperCase()
  return upper && QUARTERS.has(upper) ? upper : null
}

export interface NameRef {
  id: string
  name: string
}

export interface ValidationContext {
  eligibleOwners: NameRef[]
  profiles: NameRef[]
  categories: NameRef[]
}

export interface TaskImportPayload {
  action_number: string | null
  title: string
  description: string | null
  owner_id: string | null
  assigned_to_id: string | null
  due_date: string | null
  deadline: string | null
  quarter: string | null
  category_id: string | null
  notes: string | null
  link_url: string | null
  status: 'pending'
}

export type ValidatedRow = { ok: true; task: TaskImportPayload } | { ok: false; reason: string }

function findByName(refs: NameRef[], name: string | undefined): NameRef | null | undefined {
  const trimmed = name?.trim()
  if (!trimmed) return null // not provided -- valid, just unset
  return refs.find((r) => r.name.toLowerCase() === trimmed.toLowerCase())
}

// The real validation core (CLAUDE.md-adjacent feature, 14 Oct 2026 session) -- matches the
// same rules POST /api/tasks enforces for a single manually-created task: Owner must resolve
// to one of the 3 eligible people, deadline never later than due date, Category must resolve
// to a real category. No Status column -- every imported task starts 'pending', period.
export function validateImportRow(row: RawImportRow, ctx: ValidationContext): ValidatedRow {
  const title = row['Title']?.trim()
  if (!title) return { ok: false, reason: 'Title is required' }

  const ownerMatch = findByName(ctx.eligibleOwners, row['Owner'])
  if (ownerMatch === undefined) {
    return { ok: false, reason: `Owner '${row['Owner']}' is not one of the 3 eligible owners (${ELIGIBLE_OWNER_NAMES.join(', ')})` }
  }

  const assignedToMatch = findByName(ctx.profiles, row['Assigned To'])
  if (assignedToMatch === undefined) {
    return { ok: false, reason: `Assigned To '${row['Assigned To']}' does not match any profile` }
  }

  const categoryMatch = findByName(ctx.categories, row['Category'])
  if (categoryMatch === undefined) {
    return { ok: false, reason: `Category '${row['Category']}' does not match any existing category` }
  }

  const dueDate = normalizeDate(row['Due Date'])
  const deadline = normalizeDate(row['Deadline'])
  if (dueDate && deadline && deadline > dueDate) {
    return { ok: false, reason: 'Deadline cannot be later than the Due date' }
  }

  return {
    ok: true,
    task: {
      action_number: row['Action Number']?.trim() || null,
      title,
      description: row['Description']?.trim() || null,
      owner_id: ownerMatch?.id ?? null,
      assigned_to_id: assignedToMatch?.id ?? null,
      due_date: dueDate,
      deadline,
      quarter: normalizeQuarter(row['Quarter']),
      category_id: categoryMatch?.id ?? null,
      notes: row['Notes']?.trim() || null,
      link_url: row['Link URL']?.trim() || null,
      status: 'pending',
    },
  }
}
