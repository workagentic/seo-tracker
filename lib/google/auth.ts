import { JWT } from 'google-auth-library'

const clients = new Map<string, JWT>()

function unescapePrivateKey(key: string): string {
  return key.replace(/\\n/g, '\n')
}

function getClient(scopes: string[]): JWT {
  const cacheKey = [...scopes].sort().join(',')
  const existing = clients.get(cacheKey)
  if (existing) return existing

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
  if (!email || !privateKey) {
    throw new Error(
      'GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY must both be set'
    )
  }

  const client = new JWT({ email, key: unescapePrivateKey(privateKey), scopes })
  clients.set(cacheKey, client)
  return client
}

// google-auth-library's JWT client caches its own token internally (keyed on its
// credentials' expiry_date) and only re-authenticates when the cached token is stale, so
// reusing one JWT client instance per scope-set (via the module-level cache above) is
// sufficient — no separate expiry-tracking needed here.
export async function getGoogleAccessToken(scopes: string[]): Promise<string> {
  const client = getClient(scopes)
  const { token } = await client.getAccessToken()
  if (!token) throw new Error('Failed to obtain Google access token')
  return token
}
