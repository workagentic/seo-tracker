// Free RDAP (the modern WHOIS replacement) lookups for domain-age/registration info on the
// Competitor Tracker. No API key: rdap.org proxies/redirects to the correct registry's own
// RDAP server for the domain's TLD, so a plain fetch() (which follows redirects by default)
// is all this needs.
const RDAP_BASE = 'https://rdap.org/domain'

export interface DomainRegistration {
  created_at: string | null
  expires_at: string | null
  updated_at: string | null
}

interface RdapEvent {
  eventAction: string
  eventDate: string
}
interface RdapResponse {
  events?: RdapEvent[]
}

function dateOnly(isoDateTime: string): string {
  return isoDateTime.slice(0, 10)
}

function findEventDate(events: RdapEvent[], actions: string[]): string | null {
  for (const action of actions) {
    const match = events.find((e) => e.eventAction === action)
    if (match) return dateOnly(match.eventDate)
  }
  return null
}

// Never throws -- coverage/field availability genuinely varies by TLD and registry, and a
// failed lookup (unsupported TLD, timeout, malformed response) should never block the
// competitor/domain action it's attached to. Callers treat `null` as "no data available".
export async function fetchDomainRegistration(domain: string): Promise<DomainRegistration | null> {
  try {
    const res = await fetch(`${RDAP_BASE}/${encodeURIComponent(domain)}`)
    if (!res.ok) return null

    const data = (await res.json()) as RdapResponse
    const events = data.events ?? []

    return {
      created_at: findEventDate(events, ['registration']),
      expires_at: findEventDate(events, ['expiration']),
      // Registries vary on which of these two they populate.
      updated_at: findEventDate(events, ['last changed', 'last update of RDAP database']),
    }
  } catch {
    return null
  }
}
