import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const getAccessTokenMock = vi.fn()
const jwtConstructorMock = vi.fn<(opts: { email: string; key: string; scopes: string[] }) => { getAccessToken: typeof getAccessTokenMock }>(
  () => ({ getAccessToken: getAccessTokenMock })
)
vi.mock('google-auth-library', () => {
  return {
    JWT: function (opts: { email: string; key: string; scopes: string[] }) {
      return jwtConstructorMock(opts)
    },
  }
})

import { getGoogleAccessToken } from './auth'

describe('getGoogleAccessToken', () => {
  const ORIGINAL_ENV = { ...process.env }

  beforeEach(() => {
    getAccessTokenMock.mockReset()
    jwtConstructorMock.mockClear()
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

  it('strips surrounding double quotes carried over from a quoted .env value', async () => {
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY =
      '"-----BEGIN PRIVATE KEY-----\\nquoted-key\\n-----END PRIVATE KEY-----\\n"'
    getAccessTokenMock.mockResolvedValue({ token: 'fake-token' })
    await getGoogleAccessToken(['quoted-scope'])
    const passedKey = jwtConstructorMock.mock.calls[0]![0].key
    expect(passedKey.startsWith('"')).toBe(false)
    expect(passedKey).toBe('-----BEGIN PRIVATE KEY-----\nquoted-key\n-----END PRIVATE KEY-----')
  })

  it('accepts a key that already has real newlines instead of escaped ones', async () => {
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY =
      '-----BEGIN PRIVATE KEY-----\nreal-newlines\n-----END PRIVATE KEY-----'
    getAccessTokenMock.mockResolvedValue({ token: 'fake-token' })
    await getGoogleAccessToken(['real-newline-scope'])
    const passedKey = jwtConstructorMock.mock.calls[0]![0].key
    expect(passedKey).toBe('-----BEGIN PRIVATE KEY-----\nreal-newlines\n-----END PRIVATE KEY-----')
  })

  it('trims leading/trailing whitespace from a pasted value', async () => {
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY =
      '  \n-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----\\n  \n'
    getAccessTokenMock.mockResolvedValue({ token: 'fake-token' })
    await getGoogleAccessToken(['whitespace-scope'])
    const passedKey = jwtConstructorMock.mock.calls[0]![0].key
    expect(passedKey.startsWith(' ') || passedKey.startsWith('\n')).toBe(false)
    expect(passedKey.endsWith(' ') || passedKey.endsWith('\n\n')).toBe(false)
  })
})
