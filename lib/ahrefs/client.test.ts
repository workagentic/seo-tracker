import { describe, it, expect } from 'vitest'
import { fetchAhrefsMetrics } from './client'

describe('fetchAhrefsMetrics (no API key)', () => {
  it('returns fixture data for a known domain', async () => {
    const result = await fetchAhrefsMetrics('expertiseaccelerated.com')
    expect(result.domain_rating).toBe(26)
  })
  it('throws for an unknown domain', async () => {
    await expect(fetchAhrefsMetrics('unknown-domain.com')).rejects.toThrow()
  })
})
