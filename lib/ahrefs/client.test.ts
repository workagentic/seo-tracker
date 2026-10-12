import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchAhrefsMetrics, ahrefsGet } from './client'

describe('fetchAhrefsMetrics (no API key)', () => {
  it('returns fixture data for a known domain', async () => {
    const result = await fetchAhrefsMetrics('expertiseaccelerated.com')
    expect(result.domain_rating).toBe(26)
  })
  it('throws for an unknown domain', async () => {
    await expect(fetchAhrefsMetrics('unknown-domain.com')).rejects.toThrow()
  })
})

describe('ahrefsGet retry behavior', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  it('returns the response on a first-try success', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({ ok: true }) } as Response)
    const result = await ahrefsGet('/site-explorer/metrics', { target: 'example.com' })
    expect(result).toEqual({ ok: true })
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('retries once after a 5xx and succeeds on the second attempt', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Internal Server Error' } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) } as Response)

    const result = await ahrefsGet('/site-explorer/metrics', { target: 'example.com' })
    expect(result).toEqual({ ok: true })
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('throws immediately on a 4xx without retrying', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false, status: 401, statusText: 'Unauthorized' } as Response)
    await expect(ahrefsGet('/site-explorer/metrics', { target: 'example.com' })).rejects.toThrow(/401/)
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('throws after a second consecutive 5xx', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false, status: 500, statusText: 'Internal Server Error' } as Response)
    await expect(ahrefsGet('/site-explorer/metrics', { target: 'example.com' })).rejects.toThrow(/500/)
    expect(fetch).toHaveBeenCalledTimes(2)
  })
})
