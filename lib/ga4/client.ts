import { getGoogleAccessToken } from '@/lib/google/auth'

const GA4_SCOPE = 'https://www.googleapis.com/auth/analytics.readonly'
const GA4_BASE = 'https://analyticsdata.googleapis.com/v1beta'

export interface Ga4Metrics {
  sessions: number
  totalUsers: number
  newUsers: number
  bounceRate: number
  averageSessionDuration: number
}

interface RunReportResponse {
  rows?: Array<{ metricValues: Array<{ value: string }> }>
}

async function runReport(propertyId: string, token: string, days: number, usOnly: boolean): Promise<Ga4Metrics> {
  const body: Record<string, unknown> = {
    dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'today' }],
    metrics: [
      { name: 'sessions' },
      { name: 'totalUsers' },
      { name: 'newUsers' },
      { name: 'bounceRate' },
      { name: 'averageSessionDuration' },
    ],
  }
  if (usOnly) {
    body.dimensionFilter = {
      filter: { fieldName: 'country', stringFilter: { matchType: 'EXACT', value: 'United States' } },
    }
  }

  const res = await fetch(`${GA4_BASE}/properties/${propertyId}:runReport`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}) as { error?: { message?: string } })
    const detail = errBody?.error?.message ? ` — ${errBody.error.message}` : ''
    throw new Error(`GA4 API error: ${res.status} ${res.statusText}${detail}`)
  }

  const data = (await res.json()) as RunReportResponse
  const values = data.rows?.[0]?.metricValues
  if (!values) {
    return { sessions: 0, totalUsers: 0, newUsers: 0, bounceRate: 0, averageSessionDuration: 0 }
  }

  return {
    sessions: Number(values[0].value),
    totalUsers: Number(values[1].value),
    newUsers: Number(values[2].value),
    bounceRate: Number(values[3].value),
    averageSessionDuration: Number(values[4].value),
  }
}

export interface Ga4SnapshotMetrics {
  global: Ga4Metrics
  us: Ga4Metrics
}

export async function fetchGa4Metrics(propertyId: string, days = 28): Promise<Ga4SnapshotMetrics> {
  const token = await getGoogleAccessToken([GA4_SCOPE])
  const [global, us] = await Promise.all([
    runReport(propertyId, token, days, false),
    runReport(propertyId, token, days, true),
  ])
  return { global, us }
}
