import { getGoogleAccessToken } from '@/lib/google/auth'

const GSC_SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly'
const URL_INSPECTION_BASE = 'https://searchconsole.googleapis.com/v1'
// Sitemaps API lives on the same base as searchAnalytics.query (lib/gsc/client.ts's
// SEARCH_CONSOLE_BASE) -- confirmed against the live API alongside that base URL's own
// correction (CLAUDE.md Section 7.2).
const SITEMAPS_BASE = 'https://searchconsole.googleapis.com/webmasters/v3'

// Conservative delay between URL Inspection calls -- gentle on its quota, same spirit as
// Ahrefs' AHREFS_INTER_DOMAIN_DELAY_MS.
export const GSC_INSPECTION_DELAY_MS = 300

export interface UrlInspectionResult {
  coverageState: string
  verdict: string
  robotsTxtState: string | null
  lastCrawlTime: string | null
}

interface InspectionApiResponse {
  inspectionResult?: {
    indexStatusResult?: {
      coverageState?: string
      verdict?: string
      robotsTxtState?: string
      lastCrawlTime?: string
    }
  }
}

export async function fetchUrlInspection(siteUrl: string, inspectionUrl: string): Promise<UrlInspectionResult> {
  const token = await getGoogleAccessToken([GSC_SCOPE])

  const res = await fetch(`${URL_INSPECTION_BASE}/urlInspection/index:inspect`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ inspectionUrl, siteUrl }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}) as { error?: { message?: string } })
    const detail = body?.error?.message ? ` — ${body.error.message}` : ''
    throw new Error(`GSC URL Inspection API error: ${res.status} ${res.statusText}${detail}`)
  }

  const data = (await res.json()) as InspectionApiResponse
  const status = data.inspectionResult?.indexStatusResult

  return {
    coverageState: status?.coverageState ?? 'Unknown',
    verdict: status?.verdict ?? 'VERDICT_UNSPECIFIED',
    robotsTxtState: status?.robotsTxtState ?? null,
    lastCrawlTime: status?.lastCrawlTime ?? null,
  }
}

export interface SitemapIssue {
  path: string
  errors: number
  warnings: number
}

interface SitemapsApiResponse {
  sitemap?: Array<{
    path?: string
    errors?: string | number
    warnings?: string | number
  }>
}

export async function fetchSitemapIssues(siteUrl: string): Promise<SitemapIssue[]> {
  const token = await getGoogleAccessToken([GSC_SCOPE])

  const res = await fetch(`${SITEMAPS_BASE}/sites/${encodeURIComponent(siteUrl)}/sitemaps`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}) as { error?: { message?: string } })
    const detail = body?.error?.message ? ` — ${body.error.message}` : ''
    throw new Error(`GSC Sitemaps API error: ${res.status} ${res.statusText}${detail}`)
  }

  const data = (await res.json()) as SitemapsApiResponse
  return (data.sitemap ?? []).map((s) => ({
    path: s.path ?? '',
    errors: Number(s.errors ?? 0),
    warnings: Number(s.warnings ?? 0),
  }))
}
