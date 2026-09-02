import { getGoogleAccessToken } from '@/lib/google/auth'

const GSC_SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly'
// searchAnalytics.query only exists under the older Webmasters API path — the newer
// searchconsole.googleapis.com/v1 path 404s for this specific endpoint (confirmed against
// the live API 29 Aug 2026; v1 does exist for other Search Console endpoints, just not this one).
const SEARCH_CONSOLE_BASE = 'https://searchconsole.googleapis.com/webmasters/v3'
// GSC data typically lags 2-3 days behind real-time, so the window ends 2 days ago rather
// than today to avoid a trailing tail of partial/zero rows.
const REPORT_LAG_DAYS = 2

export interface GscQueryRow {
  query: string
  page: string
  position: number
  clicks: number
  impressions: number
  ctr: number
}

interface SearchAnalyticsRow {
  keys: [string, string]
  clicks: number
  impressions: number
  ctr: number
  position: number
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

// `country`, when given, is a 3-letter ISO 3166-1 alpha-3 code (lowercase, e.g. 'usa') --
// GSC's own country dimension format. Used by the Scorecard actuals sync (Section 14 Phase 5)
// to get a US-scoped read the same way it fetches a separate global (unfiltered) read, mirroring
// the Global/US split pattern Ahrefs metrics already use.
export async function fetchGscQueryPositions(siteUrl: string, days = 90, country?: string): Promise<GscQueryRow[]> {
  const token = await getGoogleAccessToken([GSC_SCOPE])

  const end = new Date()
  end.setDate(end.getDate() - REPORT_LAG_DAYS)
  const start = new Date(end)
  start.setDate(start.getDate() - days)

  const requestBody: Record<string, unknown> = {
    startDate: formatDate(start),
    endDate: formatDate(end),
    dimensions: ['query', 'page'],
    rowLimit: 5000,
  }
  if (country) {
    requestBody.dimensionFilterGroups = [
      { filters: [{ dimension: 'country', operator: 'equals', expression: country }] },
    ]
  }

  const url = `${SEARCH_CONSOLE_BASE}/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}) as { error?: { message?: string } })
    const detail = body?.error?.message ? ` — ${body.error.message}` : ''
    throw new Error(`GSC API error: ${res.status} ${res.statusText}${detail}`)
  }

  const data = (await res.json()) as { rows?: SearchAnalyticsRow[] }
  return (data.rows ?? []).map((row) => ({
    query: row.keys[0],
    page: row.keys[1],
    clicks: row.clicks,
    impressions: row.impressions,
    ctr: row.ctr,
    position: row.position,
  }))
}
