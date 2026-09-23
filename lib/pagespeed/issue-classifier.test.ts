import { describe, it, expect } from 'vitest'
import { classifyPageSpeed } from './issue-classifier'

describe('classifyPageSpeed', () => {
  it('flags SLOW field data as high severity', () => {
    const result = classifyPageSpeed({ category: 'SLOW', performanceScore: 0.3 })
    expect(result.hasIssue).toBe(true)
    expect(result.severity).toBe('high')
  })

  it('flags AVERAGE field data as medium severity', () => {
    const result = classifyPageSpeed({ category: 'AVERAGE', performanceScore: 0.6 })
    expect(result.hasIssue).toBe(true)
    expect(result.severity).toBe('medium')
  })

  it('treats FAST field data as no issue', () => {
    const result = classifyPageSpeed({ category: 'FAST', performanceScore: 0.95 })
    expect(result.hasIssue).toBe(false)
  })

  it('falls back to a low lab performance score when there is no field data', () => {
    const result = classifyPageSpeed({ category: null, performanceScore: 0.35 })
    expect(result.hasIssue).toBe(true)
    expect(result.severity).toBe('medium')
  })

  it('does not flag a borderline lab score when there is no field data', () => {
    const result = classifyPageSpeed({ category: null, performanceScore: 0.7 })
    expect(result.hasIssue).toBe(false)
  })

  it('does not flag when there is no field data and no lab score', () => {
    const result = classifyPageSpeed({ category: null, performanceScore: null })
    expect(result.hasIssue).toBe(false)
  })
})
