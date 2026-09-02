import { describe, it, expect } from 'vitest'
import { getAllowedStatuses, canEditTaskStatus } from './permissions'

const baseTask = {
  owner_id: 'owner-1',
  assigned_to_id: null,
}

describe('getAllowedStatuses', () => {
  it('gives admin every status regardless of ownership', () => {
    const statuses = getAllowedStatuses(baseTask, { id: 'someone-else', role: 'admin' })
    expect(statuses).toEqual(['pending', 'in_progress', 'on_hold', 'completed'])
  })

  it('gives head every status regardless of ownership', () => {
    const statuses = getAllowedStatuses(baseTask, { id: 'someone-else', role: 'head' })
    expect(statuses).toContain('completed')
  })

  it('lets the owner set every status, including completed', () => {
    const statuses = getAllowedStatuses(baseTask, { id: 'owner-1', role: 'owner' })
    expect(statuses).toEqual(['pending', 'in_progress', 'on_hold', 'completed'])
  })

  it('lets the current assignee move the task but not complete it', () => {
    const task = { ...baseTask, assigned_to_id: 'assignee-1' }
    const statuses = getAllowedStatuses(task, { id: 'assignee-1', role: 'owner' })
    expect(statuses).toEqual(['pending', 'in_progress', 'on_hold'])
    expect(statuses).not.toContain('completed')
  })

  it('lets a leadership-role profile act when they are the current assignee', () => {
    const task = { ...baseTask, assigned_to_id: 'adeela' }
    const statuses = getAllowedStatuses(task, { id: 'adeela', role: 'leadership' })
    expect(statuses).toEqual(['pending', 'in_progress', 'on_hold'])
  })

  it('gives a bystander no options', () => {
    const statuses = getAllowedStatuses(baseTask, { id: 'nobody', role: 'owner' })
    expect(statuses).toEqual([])
  })

  it('gives leadership no options when they are not the assignee', () => {
    const statuses = getAllowedStatuses(baseTask, { id: 'nobody', role: 'leadership' })
    expect(statuses).toEqual([])
  })
})

describe('canEditTaskStatus', () => {
  it('allows the owner', () => {
    expect(canEditTaskStatus(baseTask, { id: 'owner-1', role: 'owner' })).toBe(true)
  })

  it('allows the current assignee even when they are not the owner', () => {
    const task = { ...baseTask, assigned_to_id: 'assignee-1' }
    expect(canEditTaskStatus(task, { id: 'assignee-1', role: 'leadership' })).toBe(true)
  })

  it('blocks an unrelated profile', () => {
    expect(canEditTaskStatus(baseTask, { id: 'nobody', role: 'owner' })).toBe(false)
  })
})
