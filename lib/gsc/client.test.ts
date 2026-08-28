import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/google/auth', () => ({
  getGoogleAccessToken: vi.fn().mockResolvedValue('fake-token'),
}))

import { fetchGscQueryPositions } from './client'

describe('fetchGscQueryPositions', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  it('parses rows from a successful GSC response', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        rows: [
          {
            keys: ['best cpa firm', 'https://expertiseaccelerated.com/'],
            clicks: 3,
            impressions: 50,
            ctr: 0.06,
            position: 8.4,
          },
        ],
      }),
    } as Response)

    const rows = await fetchGscQueryPositions('https://expertiseaccelerated.com/', 90)

    expect(rows).toEqual([
      {
        query: 'best cpa firm',
        page: 'https://expertiseaccelerated.com/',
        clicks: 3,
        impressions: 50,
        ctr: 0.06,
        position: 8.4,
      },
    ])
  })

  it('returns an empty array when the response has no rows', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({}) } as Response)
    const rows = await fetchGscQueryPositions('https://expertiseaccelerated.com/')
    expect(rows).toEqual([])
  })

  it('throws with the Google error message on a non-2xx response', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      json: async () => ({ error: { message: 'User does not have sufficient permission' } }),
    } as Response)

    await expect(fetchGscQueryPositions('https://expertiseaccelerated.com/')).rejects.toThrow(
      /User does not have sufficient permission/
    )
  })
})
