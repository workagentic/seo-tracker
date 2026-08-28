import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const getAccessTokenMock = vi.fn()
vi.mock('google-auth-library', () => {
  return {
    JWT: vi.fn(function JWT() {
      return { getAccessToken: getAccessTokenMock }
    }),
  }
})

import { getGoogleAccessToken } from './auth'

describe('getGoogleAccessToken', () => {
  const ORIGINAL_ENV = { ...process.env }

  beforeEach(() => {
    getAccessTokenMock.mockReset()
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = 'test@example.iam.gserviceaccount.com'
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY =
      '-----BEGIN PRIVATE KEY-----\\nabc123\\n-----END PRIVATE KEY-----\\n'
  })

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV }
  })

  it('returns the access token from the JWT client', async () => {
    getAccessTokenMock.mockResolvedValue({ token: 'fake-token' })
    const token = await getGoogleAccessToken(['https://www.googleapis.com/auth/webmasters.readonly'])
    expect(token).toBe('fake-token')
  })

  it('throws when GOOGLE_SERVICE_ACCOUNT_EMAIL is missing', async () => {
    delete process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
    await expect(getGoogleAccessToken(['some-other-scope'])).rejects.toThrow(
      /GOOGLE_SERVICE_ACCOUNT_EMAIL/
    )
  })

  it('throws when the JWT client returns no token', async () => {
    getAccessTokenMock.mockResolvedValue({ token: undefined })
    await expect(getGoogleAccessToken(['yet-another-scope'])).rejects.toThrow(
      /Failed to obtain Google access token/
    )
  })
})
