// Google PageSpeed Insights API -- a separate Google product/API from Search Console, with
// its own (optional) API key, not the service-account auth GSC/GA4 use. Works without a key
// at a lower shared quota, so PAGESPEED_API_KEY is optional.
const PAGESPEED_BASE = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed'

export interface PageSpeedResult {
  // loadingExperience.overall_category -- real-user Core Web Vitals data. null if Google has
  // no field data for this URL (common for lower-traffic pages).
  category: 'FAST' | 'AVERAGE' | 'SLOW' | null
  // lighthouseResult.categories.performance.score, 0-1 lab data -- fallback when field data
  // is absent.
  performanceScore: number | null
}

interface PageSpeedApiResponse {
  loadingExperience?: { overall_category?: string }
  lighthouseResult?: { categories?: { performance?: { score?: number } } }
}

// Mobile-only (matches Google's own mobile-first Core Web Vitals stance). Never throws --
// PSI can fail/timeout per URL and that should never block the rest of a sync batch.
export async function fetchPageSpeed(url: string): Promise<PageSpeedResult | null> {
  try {
    const params = new URLSearchParams({ url, category: 'performance', strategy: 'mobile' })
    if (process.env.PAGESPEED_API_KEY) params.set('key', process.env.PAGESPEED_API_KEY)

    const res = await fetch(`${PAGESPEED_BASE}?${params.toString()}`)
    if (!res.ok) return null

    const data = (await res.json()) as PageSpeedApiResponse
    const rawCategory = data.loadingExperience?.overall_category
    const category = rawCategory === 'FAST' || rawCategory === 'AVERAGE' || rawCategory === 'SLOW' ? rawCategory : null

    return {
      category,
      performanceScore: data.lighthouseResult?.categories?.performance?.score ?? null,
    }
  } catch {
    return null
  }
}
