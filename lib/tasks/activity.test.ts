import { describe, it, expect } from 'vitest'
import { computeTaskActivityEntries } from './activity'

describe('computeTaskActivityEntries', () => {
  it('produces one entry for a changed field', () => {
    const current = { status: 'pending', notes: null }
    const updates = { status: 'in_progress' }

    const entries = computeTaskActivityEntries(current, updates)

    expect(entries).toEqual([{ field: 'status', old_value: 'pending', new_value: 'in_progress' }])
  })

  it('produces no entry when the new value is the same as the old one', () => {
    const current = { status: 'pending' }
    const updates = { status: 'pending' }

    expect(computeTaskActivityEntries(current, updates)).toEqual([])
  })

  it('produces no entry for a field not present in updates', () => {
    const current = { status: 'pending', title: 'Old title' }
    const updates = { notes: 'a note' }

    const entries = computeTaskActivityEntries(current, updates)

    expect(entries).toEqual([{ field: 'notes', old_value: null, new_value: 'a note' }])
  })

  it('treats null and undefined as equal (no entry) but null vs a real value as a change', () => {
    const current = { assigned_to: null }
    expect(computeTaskActivityEntries(current, { assigned_to: undefined })).toEqual([])
    expect(computeTaskActivityEntries(current, { assigned_to: 'user-1' })).toEqual([
      { field: 'assigned_to', old_value: null, new_value: 'user-1' },
    ])
  })

  it('handles multiple changed fields in one call', () => {
    const current = { status: 'pending', notes: 'old note', due_date: '2026-09-01' }
    const updates = { status: 'blocked', notes: 'new note', due_date: '2026-09-01' }

    const entries = computeTaskActivityEntries(current, updates)

    expect(entries).toEqual([
      { field: 'status', old_value: 'pending', new_value: 'blocked' },
      { field: 'notes', old_value: 'old note', new_value: 'new note' },
    ])
  })
})
