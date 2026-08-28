import { describe, it, expect } from 'vitest'
import { getNotificationsForUser } from './notifications'
import type { Task } from '@/types'

const USER_ID = 'user-1'
const OTHER_USER_ID = 'user-2'
const NOW = new Date('2026-08-28T12:00:00.000Z')

function makeTask(overrides: Partial<Task>): Task {
  return {
    id: 't1',
    action_number: 'A1',
    title: 'Some task',
    description: null,
    position_responsible: null,
    assigned_to: USER_ID,
    co_assigned_to: null,
    due_date: null,
    status: 'pending',
    quarter: 'Q1',
    notes: null,
    completed_at: null,
    created_at: '2020-01-01T00:00:00.000Z',
    updated_at: '2020-01-01T00:00:00.000Z',
    updated_by: null,
    ...overrides,
  }
}

describe('getNotificationsForUser', () => {
  it('ignores tasks not attached to the user', () => {
    const task = makeTask({ assigned_to: OTHER_USER_ID, co_assigned_to: null })
    expect(getNotificationsForUser([task], USER_ID, NOW)).toEqual([])
  })

  it('includes tasks where the user is the co-owner', () => {
    const task = makeTask({ assigned_to: OTHER_USER_ID, co_assigned_to: USER_ID, due_date: '2026-08-20', status: 'pending' })
    const notifications = getNotificationsForUser([task], USER_ID, NOW)
    expect(notifications.some((n) => n.type === 'overdue')).toBe(true)
  })

  it('flags a task overdue when due_date is in the past and not completed', () => {
    const task = makeTask({ due_date: '2026-08-20', status: 'in_progress' })
    const notifications = getNotificationsForUser([task], USER_ID, NOW)
    expect(notifications).toContainEqual({ type: 'overdue', taskId: 't1', actionNumber: 'A1', message: 'A1 is overdue (was due 2026-08-20)' })
  })

  it('does not flag a completed task as overdue even if past due_date', () => {
    const task = makeTask({ due_date: '2026-08-20', status: 'completed' })
    const notifications = getNotificationsForUser([task], USER_ID, NOW)
    expect(notifications.some((n) => n.type === 'overdue')).toBe(false)
  })

  it('flags a task as deadline-soon when due within 3 days', () => {
    const task = makeTask({ due_date: '2026-08-30', status: 'pending' })
    const notifications = getNotificationsForUser([task], USER_ID, NOW)
    expect(notifications).toContainEqual({ type: 'deadline-soon', taskId: 't1', actionNumber: 'A1', message: 'A1 is due 2026-08-30' })
  })

  it('does not flag a deadline more than 3 days out', () => {
    const task = makeTask({ due_date: '2026-09-15', status: 'pending' })
    const notifications = getNotificationsForUser([task], USER_ID, NOW)
    expect(notifications.some((n) => n.type === 'deadline-soon')).toBe(false)
  })

  it('flags a recently created task as newly assigned', () => {
    const task = makeTask({ created_at: '2026-08-27T00:00:00.000Z' })
    const notifications = getNotificationsForUser([task], USER_ID, NOW)
    expect(notifications.some((n) => n.type === 'assigned')).toBe(true)
  })

  it('does not flag an old task as newly assigned', () => {
    const task = makeTask({ created_at: '2020-01-01T00:00:00.000Z' })
    const notifications = getNotificationsForUser([task], USER_ID, NOW)
    expect(notifications.some((n) => n.type === 'assigned')).toBe(false)
  })

  it('flags a status change made by someone else within the last 48 hours', () => {
    const task = makeTask({ updated_by: OTHER_USER_ID, updated_at: '2026-08-28T00:00:00.000Z', status: 'blocked' })
    const notifications = getNotificationsForUser([task], USER_ID, NOW)
    expect(notifications).toContainEqual({ type: 'status-changed', taskId: 't1', actionNumber: 'A1', message: 'A1\'s status changed to "blocked"' })
  })

  it('does not flag a change the user made themselves', () => {
    const task = makeTask({ updated_by: USER_ID, updated_at: '2026-08-28T00:00:00.000Z', status: 'blocked' })
    const notifications = getNotificationsForUser([task], USER_ID, NOW)
    expect(notifications.some((n) => n.type === 'status-changed')).toBe(false)
  })

  it('does not flag a status change older than 48 hours', () => {
    const task = makeTask({ updated_by: OTHER_USER_ID, updated_at: '2026-08-01T00:00:00.000Z', status: 'blocked' })
    const notifications = getNotificationsForUser([task], USER_ID, NOW)
    expect(notifications.some((n) => n.type === 'status-changed')).toBe(false)
  })
})
