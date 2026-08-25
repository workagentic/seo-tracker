import { AHREFS_FIXTURES, type AhrefsMetricsResult } from './fixtures'

export async function fetchAhrefsMetrics(domain: string): Promise<AhrefsMetricsResult> {
  if (!process.env.AHREFS_API_KEY) {
    const fixture = AHREFS_FIXTURES[domain]
    if (!fixture) {
      throw new Error(`No Ahrefs fixture configured for domain "${domain}"`)
    }
    return fixture
  }

  // Live path — wired for CLAUDE.md Section 7.1 once AHREFS_API_KEY is set.
  // Rate limit: 1 request/second (Section 7.1) — callers must not fan this out unthrottled.
  const res = await fetch(
    `https://api.ahrefs.com/v3/site-explorer/metrics?target=${encodeURIComponent(domain)}&mode=subdomains`,
    { headers: { Authorization: `Bearer ${process.env.AHREFS_API_KEY}` } }
  )
  if (!res.ok) throw new Error(`Ahrefs API error: ${res.status} ${res.statusText}`)
  return res.json()
}
