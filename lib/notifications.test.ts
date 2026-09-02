import { describe, it, expect } from 'vitest'
import { getNotificationsForUser } from './notifications'
import type { Task, TaskComment } from '@/types'

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
    approver_id: null,
    due_date: null,
    status: 'pending',
    quarter: 'Q1',
    category: null,
    notes: null,
    link_url: null,
    repeats: null,
    next_due: null,
    linked_finding_id: null,
    linked_keyword_id: null,
    completed_at: null,
    created_at: '2020-01-01T00:00:00.000Z',
    updated_at: '2020-01-01T00:00:00.000Z',
    updated_by: null,
    ...overrides,
  }
}

function makeComment(overrides: Partial<TaskComment>): TaskComment {
  return {
    id: 'c1',
    task_id: 't1',
    author_id: OTHER_USER_ID,
    body: 'Looks good',
    created_at: '2026-08-28T00:00:00.000Z',
    ...overrides,
  }
}

describe('getNotificationsForUser', () => {
  it('ignores tasks not attached to the user', () => {
    const task = makeTask({ assigned_to: OTHER_USER_ID, co_assigned_to: null })
    expect(getNotificationsForUser([task], [], USER_ID, NOW)).toEqual([])
  })

  it('includes tasks where the user is the co-owner', () => {
    const task = makeTask({ assigned_to: OTHER_USER_ID, co_assigned_to: USER_ID, due_date: '2026-08-20', status: 'pending' })
    const notifications = getNotificationsForUser([task], [], USER_ID, NOW)
    expect(notifications.some((n) => n.type === 'overdue')).toBe(true)
  })

  it('flags a task overdue when due_date is in the past and not completed', () => {
    const task = makeTask({ due_date: '2026-08-20', status: 'in_progress' })
    const notifications = getNotificationsForUser([task], [], USER_ID, NOW)
    expect(notifications).toContainEqual({ type: 'overdue', taskId: 't1', actionNumber: 'A1', message: 'A1 is overdue (was due 2026-08-20)', key: 'overdue:t1:2026-08-20' })
  })

  it('flags a recurring task overdue using next_due instead of due_date', () => {
    const task = makeTask({ due_date: null, repeats: 'Weekly, on Friday', next_due: '2026-08-20', status: 'pending' })
    const notifications = getNotificationsForUser([task], [], USER_ID, NOW)
    expect(notifications).toContainEqual({ type: 'overdue', taskId: 't1', actionNumber: 'A1', message: 'A1 is overdue (was due 2026-08-20)', key: 'overdue:t1:2026-08-20' })
  })

  it('prefers next_due over due_date when both are set', () => {
    const task = makeTask({ due_date: '2026-09-15', next_due: '2026-08-20', status: 'pending' })
    const notifications = getNotificationsForUser([task], [], USER_ID, NOW)
    expect(notifications.some((n) => n.type === 'overdue')).toBe(true)
  })

  it('does not flag a completed task as overdue even if past due_date', () => {
    const task = makeTask({ due_date: '2026-08-20', status: 'completed' })
    const notifications = getNotificationsForUser([task], [], USER_ID, NOW)
    expect(notifications.some((n) => n.type === 'overdue')).toBe(false)
  })

  it('flags a task as deadline-soon when due within 3 days', () => {
    const task = makeTask({ due_date: '2026-08-30', status: 'pending' })
    const notifications = getNotificationsForUser([task], [], USER_ID, NOW)
    expect(notifications).toContainEqual({ type: 'deadline-soon', taskId: 't1', actionNumber: 'A1', message: 'A1 is due 2026-08-30', key: 'deadline-soon:t1:2026-08-30' })
  })

  it('does not flag a deadline more than 3 days out', () => {
    const task = makeTask({ due_date: '2026-09-15', status: 'pending' })
    const notifications = getNotificationsForUser([task], [], USER_ID, NOW)
    expect(notifications.some((n) => n.type === 'deadline-soon')).toBe(false)
  })

  it('flags a recently created task as newly assigned', () => {
    const task = makeTask({ created_at: '2026-08-27T00:00:00.000Z' })
    const notifications = getNotificationsForUser([task], [], USER_ID, NOW)
    expect(notifications.some((n) => n.type === 'assigned')).toBe(true)
  })

  it('does not flag an old task as newly assigned', () => {
    const task = makeTask({ created_at: '2020-01-01T00:00:00.000Z' })
    const notifications = getNotificationsForUser([task], [], USER_ID, NOW)
    expect(notifications.some((n) => n.type === 'assigned')).toBe(false)
  })

  it('flags a status change made by someone else within the last 48 hours', () => {
    const task = makeTask({ updated_by: OTHER_USER_ID, updated_at: '2026-08-28T00:00:00.000Z', status: 'blocked' })
    const notifications = getNotificationsForUser([task], [], USER_ID, NOW)
    expect(notifications).toContainEqual({ type: 'status-changed', taskId: 't1', actionNumber: 'A1', message: 'A1\'s status changed to "blocked"', key: 'status-changed:t1:2026-08-28T00:00:00.000Z' })
  })

  it('does not flag a change the user made themselves', () => {
    const task = makeTask({ updated_by: USER_ID, updated_at: '2026-08-28T00:00:00.000Z', status: 'blocked' })
    const notifications = getNotificationsForUser([task], [], USER_ID, NOW)
    expect(notifications.some((n) => n.type === 'status-changed')).toBe(false)
  })

  it('does not flag a status change older than 48 hours', () => {
    const task = makeTask({ updated_by: OTHER_USER_ID, updated_at: '2026-08-01T00:00:00.000Z', status: 'blocked' })
    const notifications = getNotificationsForUser([task], [], USER_ID, NOW)
    expect(notifications.some((n) => n.type === 'status-changed')).toBe(false)
  })

  it('notifies the approver when a task reaches submitted_for_review', () => {
    const task = makeTask({ assigned_to: OTHER_USER_ID, approver_id: USER_ID, status: 'submitted_for_review' })
    const notifications = getNotificationsForUser([task], [], USER_ID, NOW)
    expect(notifications).toContainEqual({
      type: 'awaiting-your-approval', taskId: 't1', actionNumber: 'A1', message: 'A1 is awaiting your approval',
      key: 'awaiting-your-approval:t1:2020-01-01T00:00:00.000Z',
    })
  })

  it('does not notify the approver when the task is not yet submitted for review', () => {
    const task = makeTask({ assigned_to: OTHER_USER_ID, approver_id: USER_ID, status: 'in_progress' })
    const notifications = getNotificationsForUser([task], [], USER_ID, NOW)
    expect(notifications.some((n) => n.type === 'awaiting-your-approval')).toBe(false)
  })

  it('notifies the doer when changes are requested on their task', () => {
    const task = makeTask({ assigned_to: USER_ID, approver_id: OTHER_USER_ID, status: 'changes_requested' })
    const notifications = getNotificationsForUser([task], [], USER_ID, NOW)
    expect(notifications).toContainEqual({
      type: 'changes-requested', taskId: 't1', actionNumber: 'A1', message: 'A1 has changes requested — take another look',
      key: 'changes-requested:t1:2020-01-01T00:00:00.000Z',
    })
  })

  it('does not notify an unrelated user about someone else\'s review or change request', () => {
    const task = makeTask({ assigned_to: OTHER_USER_ID, approver_id: OTHER_USER_ID, status: 'submitted_for_review' })
    const notifications = getNotificationsForUser([task], [], USER_ID, NOW)
    expect(notifications).toEqual([])
  })

  it('notifies the owner about a new comment from someone else', () => {
    const task = makeTask({ assigned_to: USER_ID })
    const comment = makeComment({ author_id: OTHER_USER_ID })
    const notifications = getNotificationsForUser([task], [comment], USER_ID, NOW)
    expect(notifications).toContainEqual({ type: 'new-comment', taskId: 't1', actionNumber: 'A1', message: 'A1 has a new comment', key: 'new-comment:c1' })
  })

  it('notifies the approver about a new comment on a task they approve but do not own', () => {
    const task = makeTask({ assigned_to: OTHER_USER_ID, approver_id: USER_ID })
    const comment = makeComment({ author_id: OTHER_USER_ID })
    const notifications = getNotificationsForUser([task], [comment], USER_ID, NOW)
    expect(notifications.some((n) => n.type === 'new-comment')).toBe(true)
  })

  it('does not notify about the user\'s own comment', () => {
    const task = makeTask({ assigned_to: USER_ID })
    const comment = makeComment({ author_id: USER_ID })
    const notifications = getNotificationsForUser([task], [comment], USER_ID, NOW)
    expect(notifications.some((n) => n.type === 'new-comment')).toBe(false)
  })

  it('does not notify about a comment on a task the user is not attached to', () => {
    const task = makeTask({ assigned_to: OTHER_USER_ID })
    const comment = makeComment({ author_id: OTHER_USER_ID })
    const notifications = getNotificationsForUser([task], [comment], USER_ID, NOW)
    expect(notifications.some((n) => n.type === 'new-comment')).toBe(false)
  })

  it('does not notify about a comment older than 48 hours', () => {
    const task = makeTask({ assigned_to: USER_ID })
    const comment = makeComment({ author_id: OTHER_USER_ID, created_at: '2026-08-01T00:00:00.000Z' })
    const notifications = getNotificationsForUser([task], [comment], USER_ID, NOW)
    expect(notifications.some((n) => n.type === 'new-comment')).toBe(false)
  })
})
