import { describe, it, expect } from 'vitest'
import { getAllowedStatuses, canEditTaskStatus } from './permissions'

const baseTask = {
  assigned_to: 'owner-1',
  co_assigned_to: null,
  approver_id: null,
  status: 'in_progress' as const,
}

describe('getAllowedStatuses', () => {
  it('gives admin every status regardless of ownership', () => {
    const statuses = getAllowedStatuses(baseTask, { id: 'someone-else', role: 'admin' })
    expect(statuses).toContain('completed')
    expect(statuses).toContain('submitted_for_review')
    expect(statuses).toContain('changes_requested')
  })

  it('gives head every status regardless of ownership', () => {
    const statuses = getAllowedStatuses(baseTask, { id: 'someone-else', role: 'head' })
    expect(statuses).toContain('completed')
  })

  it('lets the owner self-complete when no approver is set', () => {
    const statuses = getAllowedStatuses(baseTask, { id: 'owner-1', role: 'owner' })
    expect(statuses).toContain('completed')
    expect(statuses).not.toContain('submitted_for_review')
  })

  it('caps the owner at submitted_for_review once an approver is set', () => {
    const task = { ...baseTask, approver_id: 'approver-1' }
    const statuses = getAllowedStatuses(task, { id: 'owner-1', role: 'owner' })
    expect(statuses).toContain('submitted_for_review')
    expect(statuses).not.toContain('completed')
    expect(statuses).not.toContain('changes_requested')
  })

  it('lets the approver approve or request changes only while submitted_for_review', () => {
    const waiting = { ...baseTask, approver_id: 'approver-1', status: 'submitted_for_review' as const }
    const statuses = getAllowedStatuses(waiting, { id: 'approver-1', role: 'owner' })
    expect(statuses).toContain('completed')
    expect(statuses).toContain('changes_requested')
  })

  it('does not let the approver act while the task is still in_progress', () => {
    const task = { ...baseTask, approver_id: 'approver-1', status: 'in_progress' as const }
    const statuses = getAllowedStatuses(task, { id: 'approver-1', role: 'owner' })
    expect(statuses).not.toContain('completed')
    expect(statuses).not.toContain('changes_requested')
  })

  it('gives a bystander no options', () => {
    const statuses = getAllowedStatuses(baseTask, { id: 'nobody', role: 'owner' })
    expect(statuses).toEqual([])
  })

  it('leadership gets no options either', () => {
    const statuses = getAllowedStatuses(baseTask, { id: 'owner-1', role: 'leadership' })
    expect(statuses).toEqual([])
  })
})

describe('canEditTaskStatus', () => {
  it('allows the approver even when they are not the assigned owner', () => {
    const task = { ...baseTask, approver_id: 'approver-1', status: 'submitted_for_review' as const }
    expect(canEditTaskStatus(task, { id: 'approver-1', role: 'owner' })).toBe(true)
  })

  it('blocks an unrelated owner-role profile', () => {
    expect(canEditTaskStatus(baseTask, { id: 'nobody', role: 'owner' })).toBe(false)
  })
})
