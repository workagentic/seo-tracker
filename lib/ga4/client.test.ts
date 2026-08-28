import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/google/auth', () => ({
  getGoogleAccessToken: vi.fn().mockResolvedValue('fake-token'),
}))

import { fetchGa4Metrics } from './client'

function mockReport(values: string[]) {
  return {
    ok: true,
    json: async () => ({ rows: [{ metricValues: values.map((value) => ({ value })) }] }),
  } as Response
}

describe('fetchGa4Metrics', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  it('parses global and US metrics from two separate calls', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(mockReport(['1000', '800', '600', '0.45', '120.5']))
      .mockResolvedValueOnce(mockReport(['300', '250', '200', '0.30', '90.2']))

    const result = await fetchGa4Metrics('123456789', 28)

    expect(result.global).toEqual({ sessions: 1000, totalUsers: 800, newUsers: 600, bounceRate: 0.45, averageSessionDuration: 120.5 })
    expect(result.us).toEqual({ sessions: 300, totalUsers: 250, newUsers: 200, bounceRate: 0.3, averageSessionDuration: 90.2 })
  })

  it('returns zeroed metrics when GA4 has no rows for the window', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) } as Response)

    const result = await fetchGa4Metrics('123456789')

    expect(result.global).toEqual({ sessions: 0, totalUsers: 0, newUsers: 0, bounceRate: 0, averageSessionDuration: 0 })
  })

  it('throws with the Google error message on a non-2xx response', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      json: async () => ({ error: { message: 'User does not have sufficient permission for this property' } }),
    } as Response)

    await expect(fetchGa4Metrics('123456789')).rejects.toThrow(/User does not have sufficient permission/)
  })
})
