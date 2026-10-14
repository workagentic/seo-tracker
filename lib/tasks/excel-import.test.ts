import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import { parseWorkbook, validateImportRow, type ValidationContext, type RawImportRow } from './excel-import'

const ctx: ValidationContext = {
  eligibleOwners: [
    { id: 'owner-tabish', name: 'Tabish Khalid' },
    { id: 'owner-syed', name: 'Syed Ali' },
    { id: 'owner-najma', name: 'Najma Furqan' },
  ],
  profiles: [
    { id: 'owner-tabish', name: 'Tabish Khalid' },
    { id: 'owner-syed', name: 'Syed Ali' },
    { id: 'owner-najma', name: 'Najma Furqan' },
    { id: 'profile-talha', name: 'Talha Azeem' },
  ],
  categories: [
    { id: 'cat-tech', name: 'Technical SEO' },
    { id: 'cat-onpage', name: 'On-Page Content' },
  ],
}

function row(overrides: RawImportRow): RawImportRow {
  return { Title: 'Default title', ...overrides }
}

describe('validateImportRow', () => {
  it('accepts a fully-filled valid row', () => {
    const result = validateImportRow(
      row({
        'Action Number': 'S1',
        Title: 'Optimize service page',
        Description: 'Rewrite for target keyword',
        Owner: 'Tabish Khalid',
        'Assigned To': 'Talha Azeem',
        'Due Date': '2026-10-20',
        Deadline: '2026-10-18',
        Quarter: 'q4',
        Category: 'technical seo',
        Notes: 'Priority 1',
        'Link URL': 'https://example.com',
      }),
      ctx
    )
    expect(result).toEqual({
      ok: true,
      task: {
        action_number: 'S1',
        title: 'Optimize service page',
        description: 'Rewrite for target keyword',
        owner_id: 'owner-tabish',
        assigned_to_id: 'profile-talha',
        due_date: '2026-10-20',
        deadline: '2026-10-18',
        quarter: 'Q4',
        category_id: 'cat-tech',
        notes: 'Priority 1',
        link_url: 'https://example.com',
        status: 'pending',
      },
    })
  })

  it('accepts a minimal row with only a title', () => {
    const result = validateImportRow(row({ Title: 'Just a title' }), ctx)
    expect(result).toEqual({
      ok: true,
      task: {
        action_number: null,
        title: 'Just a title',
        description: null,
        owner_id: null,
        assigned_to_id: null,
        due_date: null,
        deadline: null,
        quarter: null,
        category_id: null,
        notes: null,
        link_url: null,
        status: 'pending',
      },
    })
  })

  it('rejects a row with no title', () => {
    const result = validateImportRow(row({ Title: '   ' }), ctx)
    expect(result).toEqual({ ok: false, reason: 'Title is required' })
  })

  it('rejects an owner not in the eligible 3', () => {
    const result = validateImportRow(row({ Owner: 'Talha Azeem' }), ctx)
    expect(result.ok).toBe(false)
    expect((result as { reason: string }).reason).toMatch(/not one of the 3 eligible owners/)
  })

  it('rejects an assigned-to name that matches no profile', () => {
    const result = validateImportRow(row({ 'Assigned To': 'Nobody Here' }), ctx)
    expect(result.ok).toBe(false)
    expect((result as { reason: string }).reason).toMatch(/does not match any profile/)
  })

  it('rejects a category name that matches no existing category', () => {
    const result = validateImportRow(row({ Category: 'Not A Category' }), ctx)
    expect(result.ok).toBe(false)
    expect((result as { reason: string }).reason).toMatch(/does not match any existing category/)
  })

  it('rejects a deadline later than the due date', () => {
    const result = validateImportRow(row({ 'Due Date': '2026-10-10', Deadline: '2026-10-15' }), ctx)
    expect(result).toEqual({ ok: false, reason: 'Deadline cannot be later than the Due date' })
  })

  it('accepts a deadline on or before the due date', () => {
    const result = validateImportRow(row({ 'Due Date': '2026-10-15', Deadline: '2026-10-15' }), ctx)
    expect(result.ok).toBe(true)
  })

  it('matches owner/category names case-insensitively', () => {
    const result = validateImportRow(row({ Owner: 'TABISH KHALID', Category: 'ON-PAGE CONTENT' }), ctx)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.task.owner_id).toBe('owner-tabish')
      expect(result.task.category_id).toBe('cat-onpage')
    }
  })

  it('silently drops an unrecognized quarter value rather than failing the row', () => {
    const result = validateImportRow(row({ Quarter: 'Whenever' }), ctx)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.task.quarter).toBeNull()
  })

  it('normalizes a real Date object from a date-formatted Excel cell', () => {
    const result = validateImportRow(row({ 'Due Date': new Date('2026-11-01T00:00:00Z') }), ctx)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.task.due_date).toBe('2026-11-01')
  })
})

describe('parseWorkbook', () => {
  it('reads rows from an in-memory workbook', () => {
    const sheet = XLSX.utils.json_to_sheet([
      { 'Action Number': 'S1', Title: 'Example task', Owner: 'Tabish Khalid' },
    ])
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, sheet, 'Tasks')
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer

    const rows = parseWorkbook(buffer)
    expect(rows).toEqual([{ 'Action Number': 'S1', Title: 'Example task', Owner: 'Tabish Khalid' }])
  })
})
