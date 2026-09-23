import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchPageSpeed } from './client'

describe('fetchPageSpeed', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  it('parses field data and lab score from a successful response', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        loadingExperience: { overall_category: 'FAST' },
        lighthouseResult: { categories: { performance: { score: 0.92 } } },
      }),
    } as Response)

    const result = await fetchPageSpeed('https://expertiseaccelerated.com/about/')
    expect(result).toEqual({ category: 'FAST', performanceScore: 0.92 })
  })

  it('returns a null category when there is no field data', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ lighthouseResult: { categories: { performance: { score: 0.4 } } } }),
    } as Response)

    const result = await fetchPageSpeed('https://expertiseaccelerated.com/about/')
    expect(result).toEqual({ category: null, performanceScore: 0.4 })
  })

  it('returns null on a non-2xx response instead of throwing', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false, status: 400 } as Response)
    const result = await fetchPageSpeed('https://expertiseaccelerated.com/about/')
    expect(result).toBeNull()
  })

  it('returns null on a network error instead of throwing', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('network down'))
    const result = await fetchPageSpeed('https://expertiseaccelerated.com/about/')
    expect(result).toBeNull()
  })
})
