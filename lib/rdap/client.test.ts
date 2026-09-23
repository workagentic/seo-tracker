import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchDomainRegistration } from './client'

describe('fetchDomainRegistration', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  it('parses registration/expiration/last-changed events', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        events: [
          { eventAction: 'registration', eventDate: '1998-01-15T00:00:00Z' },
          { eventAction: 'expiration', eventDate: '2027-01-15T00:00:00Z' },
          { eventAction: 'last changed', eventDate: '2025-06-01T12:00:00Z' },
        ],
      }),
    } as Response)

    const result = await fetchDomainRegistration('example.com')

    expect(result).toEqual({
      created_at: '1998-01-15',
      expires_at: '2027-01-15',
      updated_at: '2025-06-01',
    })
  })

  it('falls back to "last update of RDAP database" when "last changed" is absent', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        events: [
          { eventAction: 'registration', eventDate: '1998-01-15T00:00:00Z' },
          { eventAction: 'last update of RDAP database', eventDate: '2026-09-01T00:00:00Z' },
        ],
      }),
    } as Response)

    const result = await fetchDomainRegistration('example.com')
    expect(result?.updated_at).toBe('2026-09-01')
  })

  it('returns nulls for missing fields rather than throwing', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({}) } as Response)
    const result = await fetchDomainRegistration('example.com')
    expect(result).toEqual({ created_at: null, expires_at: null, updated_at: null })
  })

  it('returns null on a non-2xx response (e.g. unsupported TLD)', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false, status: 404 } as Response)
    const result = await fetchDomainRegistration('example.zz')
    expect(result).toBeNull()
  })

  it('returns null on a network error instead of throwing', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('network down'))
    const result = await fetchDomainRegistration('example.com')
    expect(result).toBeNull()
  })
})
