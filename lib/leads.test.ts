import { describe, it, expect } from 'vitest'
import { getVisibleStages, LEAD_STAGES } from './leads'

describe('LEAD_STAGES', () => {
  it('has exactly the 7 pipeline stages in order', () => {
    expect(LEAD_STAGES.map((s) => s.value)).toEqual([
      'new_lead', 'introductory_call', 'followup_1', 'followup_2', 'followup_3', 'won', 'lost',
    ])
  })
})

describe('getVisibleStages', () => {
  it('shows only New Lead when a lead is brand new', () => {
    expect(getVisibleStages('new_lead')).toEqual(['new_lead'])
  })

  it('shows every stage up to and including the current one', () => {
    expect(getVisibleStages('followup_2')).toEqual([
      'new_lead', 'introductory_call', 'followup_1', 'followup_2',
    ])
  })

  it('shows all regular stages plus Won when a lead is won', () => {
    expect(getVisibleStages('won')).toEqual([
      'new_lead', 'introductory_call', 'followup_1', 'followup_2', 'followup_3', 'won',
    ])
  })

  it('shows all regular stages plus Lost when a lead is lost', () => {
    expect(getVisibleStages('lost')).toEqual([
      'new_lead', 'introductory_call', 'followup_1', 'followup_2', 'followup_3', 'lost',
    ])
  })
})
