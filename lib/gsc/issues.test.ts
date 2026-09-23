import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/google/auth', () => ({
  getGoogleAccessToken: vi.fn().mockResolvedValue('fake-token'),
}))

import { fetchUrlInspection, fetchSitemapIssues } from './issues'

describe('fetchUrlInspection', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  it('parses a successful inspection response', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        inspectionResult: {
          indexStatusResult: {
            coverageState: 'Submitted and indexed',
            verdict: 'PASS',
            robotsTxtState: 'ALLOWED',
            lastCrawlTime: '2026-09-20T00:00:00Z',
          },
        },
      }),
    } as Response)

    const result = await fetchUrlInspection('https://expertiseaccelerated.com/', 'https://expertiseaccelerated.com/about/')

    expect(result).toEqual({
      coverageState: 'Submitted and indexed',
      verdict: 'PASS',
      robotsTxtState: 'ALLOWED',
      lastCrawlTime: '2026-09-20T00:00:00Z',
    })
  })

  it('defaults to unknown/unspecified when indexStatusResult is missing', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({}) } as Response)
    const result = await fetchUrlInspection('https://expertiseaccelerated.com/', 'https://expertiseaccelerated.com/about/')
    expect(result.coverageState).toBe('Unknown')
    expect(result.verdict).toBe('VERDICT_UNSPECIFIED')
  })

  it('throws with the Google error message on a non-2xx response', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      json: async () => ({ error: { message: 'User does not have sufficient permission' } }),
    } as Response)

    await expect(fetchUrlInspection('https://expertiseaccelerated.com/', 'https://expertiseaccelerated.com/about/')).rejects.toThrow(
      /User does not have sufficient permission/
    )
  })
})

describe('fetchSitemapIssues', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  it('parses sitemap error/warning counts', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ sitemap: [{ path: 'https://expertiseaccelerated.com/sitemap.xml', errors: '2', warnings: '0' }] }),
    } as Response)

    const result = await fetchSitemapIssues('https://expertiseaccelerated.com/')
    expect(result).toEqual([{ path: 'https://expertiseaccelerated.com/sitemap.xml', errors: 2, warnings: 0 }])
  })

  it('returns an empty array when there are no sitemaps', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({}) } as Response)
    const result = await fetchSitemapIssues('https://expertiseaccelerated.com/')
    expect(result).toEqual([])
  })
})
