import type { AuditSeverity } from '@/types'
import type { PageSpeedResult } from './client'

export interface IssueClassification {
  hasIssue: boolean
  severity: AuditSeverity | null
  summary: string
}

// Real-user Core Web Vitals data (category) is preferred when Google has it; lab data
// (performanceScore) is only used as a fallback, and only flags clearly bad scores -- it's
// noisier than field data, so borderline lab scores aren't treated as issues.
export function classifyPageSpeed(result: PageSpeedResult): IssueClassification {
  if (result.category === 'SLOW') {
    return { hasIssue: true, severity: 'high', summary: 'Core Web Vitals: Slow (real-user data)' }
  }
  if (result.category === 'AVERAGE') {
    return { hasIssue: true, severity: 'medium', summary: 'Core Web Vitals: Needs improvement (real-user data)' }
  }
  if (result.category === 'FAST') {
    return { hasIssue: false, severity: null, summary: 'Core Web Vitals: Good (real-user data)' }
  }

  // No field data -- fall back to Lighthouse's lab performance score.
  if (result.performanceScore !== null && result.performanceScore < 0.5) {
    return {
      hasIssue: true,
      severity: 'medium',
      summary: `Low Lighthouse performance score (${Math.round(result.performanceScore * 100)}/100, lab data)`,
    }
  }
  return { hasIssue: false, severity: null, summary: 'No Core Web Vitals concerns detected' }
}
