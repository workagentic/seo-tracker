import { describe, it, expect } from 'vitest'
import { getAllowedStatuses, canEditTaskStatus, canCommentOnTask } from './permissions'

const baseTask = {
  owner_id: 'owner-1',
  assigned_to_id: null,
  status: 'pending' as const,
}

describe('getAllowedStatuses', () => {
  it('gives admin every status regardless of ownership', () => {
    const statuses = getAllowedStatuses(baseTask, { id: 'someone-else', role: 'admin' })
    expect(statuses).toEqual(['pending', 'in_progress', 'on_hold', 'completed'])
  })

  it('gives senior every status regardless of ownership', () => {
    const statuses = getAllowedStatuses(baseTask, { id: 'someone-else', role: 'senior' })
    expect(statuses).toContain('completed')
  })

  it('lets the owner set every status, including completed', () => {
    const statuses = getAllowedStatuses(baseTask, { id: 'owner-1', role: 'expert' })
    expect(statuses).toEqual(['pending', 'in_progress', 'on_hold', 'completed'])
  })

  it('lets the current assignee move the task between pending and in_progress only', () => {
    const task = { ...baseTask, assigned_to_id: 'assignee-1' }
    const statuses = getAllowedStatuses(task, { id: 'assignee-1', role: 'expert' })
    expect(statuses).toEqual(['pending', 'in_progress'])
    expect(statuses).not.toContain('on_hold')
    expect(statuses).not.toContain('completed')
  })

  it('lets a reviewer-role profile act when they are the current assignee', () => {
    const task = { ...baseTask, assigned_to_id: 'adeela' }
    const statuses = getAllowedStatuses(task, { id: 'adeela', role: 'reviewer' })
    expect(statuses).toEqual(['pending', 'in_progress'])
  })

  it('gives a bystander no options', () => {
    const statuses = getAllowedStatuses(baseTask, { id: 'nobody', role: 'expert' })
    expect(statuses).toEqual([])
  })

  it('gives reviewer no options when they are not the assignee', () => {
    const statuses = getAllowedStatuses(baseTask, { id: 'nobody', role: 'reviewer' })
    expect(statuses).toEqual([])
  })

  it('gives the assignee no options once the task is completed', () => {
    const task = { ...baseTask, assigned_to_id: 'assignee-1', status: 'completed' as const }
    expect(getAllowedStatuses(task, { id: 'assignee-1', role: 'expert' })).toEqual([])
  })

  it('gives the assignee no options once the task is on hold', () => {
    const task = { ...baseTask, assigned_to_id: 'assignee-1', status: 'on_hold' as const }
    expect(getAllowedStatuses(task, { id: 'assignee-1', role: 'expert' })).toEqual([])
  })

  it('still lets the owner move a locked task back to pending/in_progress', () => {
    const task = { ...baseTask, status: 'on_hold' as const }
    expect(getAllowedStatuses(task, { id: 'owner-1', role: 'senior' })).toEqual(
      ['pending', 'in_progress', 'on_hold', 'completed']
    )
  })

  it('still lets admin/senior act on a locked task regardless of ownership', () => {
    const task = { ...baseTask, status: 'completed' as const }
    expect(getAllowedStatuses(task, { id: 'someone-else', role: 'admin' })).toContain('pending')
  })
})

describe('canEditTaskStatus', () => {
  it('allows the owner', () => {
    expect(canEditTaskStatus(baseTask, { id: 'owner-1', role: 'expert' })).toBe(true)
  })

  it('allows the current assignee even when they are not the owner', () => {
    const task = { ...baseTask, assigned_to_id: 'assignee-1' }
    expect(canEditTaskStatus(task, { id: 'assignee-1', role: 'reviewer' })).toBe(true)
  })

  it('blocks an unrelated profile', () => {
    expect(canEditTaskStatus(baseTask, { id: 'nobody', role: 'expert' })).toBe(false)
  })

  it('blocks the assignee once the task is completed', () => {
    const task = { ...baseTask, assigned_to_id: 'assignee-1', status: 'completed' as const }
    expect(canEditTaskStatus(task, { id: 'assignee-1', role: 'expert' })).toBe(false)
  })

  it('blocks the assignee once the task is on hold', () => {
    const task = { ...baseTask, assigned_to_id: 'assignee-1', status: 'on_hold' as const }
    expect(canEditTaskStatus(task, { id: 'assignee-1', role: 'expert' })).toBe(false)
  })

  it('still allows the owner on a locked task', () => {
    const task = { ...baseTask, status: 'completed' as const }
    expect(canEditTaskStatus(task, { id: 'owner-1', role: 'expert' })).toBe(true)
  })
})

describe('canCommentOnTask', () => {
  it('allows anyone to comment when the task is not locked', () => {
    expect(canCommentOnTask(baseTask, { id: 'bystander', role: 'expert' })).toBe(true)
  })

  it('allows the owner to comment on a locked task', () => {
    const task = { ...baseTask, status: 'completed' as const }
    expect(canCommentOnTask(task, { id: 'owner-1', role: 'senior' })).toBe(true)
  })

  it('allows admin/senior to comment on a locked task regardless of ownership', () => {
    const task = { ...baseTask, status: 'on_hold' as const }
    expect(canCommentOnTask(task, { id: 'someone-else', role: 'admin' })).toBe(true)
  })

  it('blocks a non-owner, non-admin/senior profile from commenting on a locked task', () => {
    const task = { ...baseTask, assigned_to_id: 'assignee-1', status: 'completed' as const }
    expect(canCommentOnTask(task, { id: 'assignee-1', role: 'expert' })).toBe(false)
  })

  it('blocks even a bystander expert from commenting on a locked task', () => {
    const task = { ...baseTask, status: 'on_hold' as const }
    expect(canCommentOnTask(task, { id: 'bystander', role: 'expert' })).toBe(false)
  })
})
