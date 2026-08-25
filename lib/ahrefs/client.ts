import { AHREFS_FIXTURES, type AhrefsMetricsResult } from './fixtures'

const AHREFS_BASE = 'https://api.ahrefs.com/v3'
// Rate limit: 1 request/second (CLAUDE.md Section 7.1) — calls below run sequentially with this delay between them.
const REQUEST_DELAY_MS = 1100
// Ahrefs caps organic-keywords/top-pages results per request; counts below undercount once a
// metric (e.g. org_keywords) exceeds this, which only happens in later quarters (see QUARTERLY_TARGETS).
const RESULT_LIMIT = '1000'

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function ahrefsGet<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`${AHREFS_BASE}${path}`)
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${process.env.AHREFS_API_KEY}` },
  })
  if (!res.ok) throw new Error(`Ahrefs API error: ${res.status} ${res.statusText} (${path})`)
  return res.json()
}

interface DomainRatingResponse {
  domain_rating: { domain_rating: number; ahrefs_rank: number | null }
}
interface BacklinksStatsResponse {
  metrics: { live_refdomains: number; all_time_refdomains: number }
}
interface MetricsResponse {
  metrics: {
    org_traffic: number
    org_keywords: number
    org_keywords_1_3: number
    org_cost: number | null // USD cents
  }
}
interface OrganicKeywordsResponse {
  keywords: Array<{ best_position: number }>
}
interface TopPagesResponse {
  pages: Array<{ keywords: number }>
}

export async function fetchAhrefsMetrics(domain: string): Promise<AhrefsMetricsResult> {
  if (!process.env.AHREFS_API_KEY) {
    const fixture = AHREFS_FIXTURES[domain]
    if (!fixture) {
      throw new Error(`No Ahrefs fixture configured for domain "${domain}"`)
    }
    return fixture
  }

  const date = new Date().toISOString().slice(0, 10)
  const base = { target: domain, mode: 'subdomains', date }

  const metrics = await ahrefsGet<MetricsResponse>('/site-explorer/metrics', base)

  await sleep(REQUEST_DELAY_MS)
  const metricsUs = await ahrefsGet<MetricsResponse>('/site-explorer/metrics', { ...base, country: 'us' })

  await sleep(REQUEST_DELAY_MS)
  const domainRating = await ahrefsGet<DomainRatingResponse>('/site-explorer/domain-rating', base)

  await sleep(REQUEST_DELAY_MS)
  const backlinksStats = await ahrefsGet<BacklinksStatsResponse>('/site-explorer/backlinks-stats', base)

  await sleep(REQUEST_DELAY_MS)
  const organicKeywords = await ahrefsGet<OrganicKeywordsResponse>('/site-explorer/organic-keywords', {
    ...base,
    select: 'best_position',
    limit: RESULT_LIMIT,
  })

  await sleep(REQUEST_DELAY_MS)
  const topPages = await ahrefsGet<TopPagesResponse>('/site-explorer/top-pages', {
    ...base,
    select: 'keywords',
    limit: RESULT_LIMIT,
  })

  const keywordsTop10 = organicKeywords.keywords.filter((k) => k.best_position <= 10).length
  const indexedContentPages = topPages.pages.length
  const avgKeywordsPerPage =
    indexedContentPages > 0 ? metrics.metrics.org_keywords / indexedContentPages : 0

  return {
    domain_rating: Math.round(domainRating.domain_rating.domain_rating),
    organic_traffic: metrics.metrics.org_traffic,
    organic_traffic_us: metricsUs.metrics.org_traffic,
    organic_keywords: metrics.metrics.org_keywords,
    organic_keywords_us: metricsUs.metrics.org_keywords,
    keywords_top_3: metrics.metrics.org_keywords_1_3,
    keywords_top_10: keywordsTop10,
    traffic_value_monthly: metrics.metrics.org_cost ? metrics.metrics.org_cost / 100 : 0,
    referring_domains_total: backlinksStats.metrics.live_refdomains,
    avg_keywords_per_page: Math.round(avgKeywordsPerPage * 10) / 10,
    indexed_content_pages: indexedContentPages,
  }
}
