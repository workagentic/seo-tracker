export interface AhrefsMetricsResult {
  domain_rating: number
  organic_traffic: number
  organic_keywords: number
  keywords_top_3: number
  keywords_top_10: number
  traffic_value_monthly: number
  referring_domains_total: number
  avg_keywords_per_page: number
  indexed_content_pages: number
}

// Fixture data standing in for a real Ahrefs v3 Site Explorer response
// until AHREFS_API_KEY is configured (CLAUDE.md Section 7.1).
export const AHREFS_FIXTURES: Record<string, AhrefsMetricsResult> = {
  'expertiseaccelerated.com': {
    domain_rating: 26, organic_traffic: 540, organic_keywords: 245,
    keywords_top_3: 36, keywords_top_10: 192, traffic_value_monthly: 3050,
    referring_domains_total: 905, avg_keywords_per_page: 4.1,
    indexed_content_pages: 61,
  },
}
