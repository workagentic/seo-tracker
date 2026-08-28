import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchClarityInsights } from './client'

interface MockMetricEntry {
  metricName: string
  information: Array<Record<string, unknown>>
}

function mockClarityResponse(overrides: MockMetricEntry[] = []): Response {
  const base: MockMetricEntry[] = [
    { metricName: 'Traffic', information: [{ totalSessionCount: '132', totalBotSessionCount: '127', distinctUserCount: '255' }] },
    { metricName: 'ScrollDepth', information: [{ averageScrollDepth: 33.23 }] },
    { metricName: 'DeadClickCount', information: [{ subTotal: '42' }] },
    { metricName: 'RageClickCount', information: [{ subTotal: '0' }] },
    { metricName: 'ScriptErrorCount', information: [{ subTotal: '17' }] },
    { metricName: 'PopularPages', information: [{ url: 'https://expertiseaccelerated.com/', visitsCount: '60' }] },
  ]
  const merged = [...base]
  for (const o of overrides) {
    const i = merged.findIndex((m) => m.metricName === o.metricName)
    if (i >= 0) merged[i] = o
    else merged.push(o)
  }
  return { ok: true, json: async () => merged } as unknown as Response
}

describe('fetchClarityInsights', () => {
  const ORIGINAL_ENV = { ...process.env }

  beforeEach(() => {
    process.env.CLARITY_API_TOKEN = 'fake-token'
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV }
  })

  it('parses traffic, scroll depth, click metrics, and top pages', async () => {
    vi.mocked(fetch).mockResolvedValue(mockClarityResponse())

    const result = await fetchClarityInsights()

    expect(result).toEqual({
      totalSessions: 132,
      botSessions: 127,
      distinctUsers: 255,
      deadClickCount: 42,
      rageClickCount: 0,
      scriptErrorCount: 17,
      avgScrollDepth: 33.23,
      topPages: [{ url: 'https://expertiseaccelerated.com/', visits: 60 }],
    })
  })

  it('defaults missing metrics to zero instead of throwing', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => [] } as Response)

    const result = await fetchClarityInsights()

    expect(result.totalSessions).toBe(0)
    expect(result.topPages).toEqual([])
  })

  it('throws when CLARITY_API_TOKEN is missing', async () => {
    delete process.env.CLARITY_API_TOKEN
    await expect(fetchClarityInsights()).rejects.toThrow(/CLARITY_API_TOKEN/)
  })

  it('throws with response detail on a non-2xx response', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      text: async () => 'Invalid token',
    } as Response)

    await expect(fetchClarityInsights()).rejects.toThrow(/Clarity API error: 401.*Invalid token/)
  })
})
