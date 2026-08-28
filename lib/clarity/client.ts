// Confirmed against the live API 29 Aug 2026: /export/api/v1 (as originally documented in
// CLAUDE.md Section 7.4) 404s — the real path is /export-data/api/v1. numOfDays is capped
// at 3 on the current plan (7 returns 400 Bad Request), so this can only ever report a
// trailing 3-day window, not a full week.
const CLARITY_BASE = 'https://www.clarity.ms/export-data/api/v1'
const NUM_OF_DAYS = 3

export interface ClarityTopPage {
  url: string
  visits: number
}

export interface ClarityMetrics {
  totalSessions: number
  botSessions: number
  distinctUsers: number
  deadClickCount: number
  rageClickCount: number
  scriptErrorCount: number
  avgScrollDepth: number
  topPages: ClarityTopPage[]
}

interface ClarityMetricEntry {
  metricName: string
  information: Array<Record<string, unknown>>
}

function findMetric(data: ClarityMetricEntry[], name: string): Array<Record<string, unknown>> {
  return data.find((d) => d.metricName === name)?.information ?? []
}

function toNumber(v: unknown): number {
  return typeof v === 'number' ? v : Number(v) || 0
}

export async function fetchClarityInsights(): Promise<ClarityMetrics> {
  if (!process.env.CLARITY_API_TOKEN) {
    throw new Error('CLARITY_API_TOKEN is not configured')
  }

  const res = await fetch(`${CLARITY_BASE}/project-live-insights?numOfDays=${NUM_OF_DAYS}`, {
    headers: { Authorization: `Bearer ${process.env.CLARITY_API_TOKEN}` },
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Clarity API error: ${res.status} ${res.statusText}${detail ? ` — ${detail.slice(0, 200)}` : ''}`)
  }

  const data = (await res.json()) as ClarityMetricEntry[]

  const traffic = findMetric(data, 'Traffic')[0] ?? {}
  const scroll = findMetric(data, 'ScrollDepth')[0] ?? {}
  const deadClick = findMetric(data, 'DeadClickCount')[0] ?? {}
  const rageClick = findMetric(data, 'RageClickCount')[0] ?? {}
  const scriptError = findMetric(data, 'ScriptErrorCount')[0] ?? {}
  const popularPages = findMetric(data, 'PopularPages')

  return {
    totalSessions: toNumber(traffic.totalSessionCount),
    botSessions: toNumber(traffic.totalBotSessionCount),
    distinctUsers: toNumber(traffic.distinctUserCount),
    deadClickCount: toNumber(deadClick.subTotal),
    rageClickCount: toNumber(rageClick.subTotal),
    scriptErrorCount: toNumber(scriptError.subTotal),
    avgScrollDepth: toNumber(scroll.averageScrollDepth),
    topPages: popularPages.slice(0, 5).map((p) => ({ url: String(p.url), visits: toNumber(p.visitsCount) })),
  }
}
