import { describe, it, expect } from 'vitest'
import { classifyCoverageState, classifySitemapIssue } from './issue-classifier'

describe('classifyCoverageState', () => {
  const okCases = [
    'Submitted and indexed',
    'Indexed, not submitted in sitemap',
    'Alternate page with proper canonical tag',
  ]
  for (const state of okCases) {
    it(`treats "${state}" as OK`, () => {
      expect(classifyCoverageState(state, 'PASS')).toEqual({ hasIssue: false, severity: null, summary: state })
    })
  }

  const criticalCases = ['Not found (404)', 'Server error (5xx)', 'Blocked due to unauthorized request (401)']
  for (const state of criticalCases) {
    it(`treats "${state}" as critical`, () => {
      const result = classifyCoverageState(state, 'FAIL')
      expect(result.hasIssue).toBe(true)
      expect(result.severity).toBe('critical')
    })
  }

  const highCases = ["Blocked by robots.txt", "Excluded by 'noindex' tag", 'Duplicate, Google chose different canonical than user']
  for (const state of highCases) {
    it(`treats "${state}" as high`, () => {
      const result = classifyCoverageState(state, 'FAIL')
      expect(result.hasIssue).toBe(true)
      expect(result.severity).toBe('high')
    })
  }

  const mediumCases = [
    'Crawled - currently not indexed',
    'Discovered - currently not indexed',
    'Duplicate without user-selected canonical',
    'Page with redirect',
  ]
  for (const state of mediumCases) {
    it(`treats "${state}" as medium`, () => {
      const result = classifyCoverageState(state, 'PARTIAL')
      expect(result.hasIssue).toBe(true)
      expect(result.severity).toBe('medium')
    })
  }

  it('flags an unrecognized state as low severity when verdict is not PASS', () => {
    const result = classifyCoverageState('Some new coverage state Google added', 'FAIL')
    expect(result).toEqual({ hasIssue: true, severity: 'low', summary: 'Some new coverage state Google added' })
  })

  it('does not flag an unrecognized state when verdict is PASS', () => {
    const result = classifyCoverageState('Some new coverage state Google added', 'PASS')
    expect(result.hasIssue).toBe(false)
  })
})

describe('classifySitemapIssue', () => {
  it('flags errors as high severity', () => {
    expect(classifySitemapIssue(2, 1)).toEqual({ hasIssue: true, severity: 'high', summary: '2 error(s), 1 warning(s)' })
  })

  it('flags warnings-only as medium severity', () => {
    expect(classifySitemapIssue(0, 3)).toEqual({ hasIssue: true, severity: 'medium', summary: '3 warning(s)' })
  })

  it('is OK with no errors or warnings', () => {
    expect(classifySitemapIssue(0, 0)).toEqual({ hasIssue: false, severity: null, summary: 'No errors or warnings' })
  })
})
