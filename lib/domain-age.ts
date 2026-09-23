// Formats a domain's registration age (competitors.domain_created_at /
// app_settings.domain_created_at, both 'YYYY-MM-DD') as e.g. "12y 3m", "8m", "<1m".
// `now` is injectable for deterministic tests.
export function formatDomainAge(createdAt: string | null, now: Date = new Date()): string {
  if (!createdAt) return '—'

  const created = new Date(`${createdAt}T00:00:00Z`)
  if (Number.isNaN(created.getTime())) return '—'

  let years = now.getUTCFullYear() - created.getUTCFullYear()
  let months = now.getUTCMonth() - created.getUTCMonth()
  if (now.getUTCDate() < created.getUTCDate()) months--
  if (months < 0) {
    years--
    months += 12
  }
  // A creation date in the future is bad data (a failed/garbled RDAP lookup) -- don't
  // fabricate a negative age.
  if (years < 0) return '—'

  if (years === 0 && months === 0) return '<1m'
  if (years === 0) return `${months}m`
  if (months === 0) return `${years}y`
  return `${years}y ${months}m`
}
