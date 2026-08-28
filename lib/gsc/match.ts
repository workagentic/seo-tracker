import type { TrackedKeyword } from '@/types'
import type { GscQueryRow } from './client'

export interface GscKeywordMatch {
  keyword: TrackedKeyword
  position: number
  page: string
}

function normalize(value: string): string {
  return value.trim().toLowerCase()
}

export function matchTrackedKeywords(
  keywords: TrackedKeyword[],
  rows: GscQueryRow[]
): GscKeywordMatch[] {
  const bestByQuery = new Map<string, { position: number; page: string }>()
  for (const row of rows) {
    const key = normalize(row.query)
    const existing = bestByQuery.get(key)
    if (!existing || row.position < existing.position) {
      bestByQuery.set(key, { position: row.position, page: row.page })
    }
  }

  const matches: GscKeywordMatch[] = []
  for (const keyword of keywords) {
    const best = bestByQuery.get(normalize(keyword.keyword))
    if (best) matches.push({ keyword, position: best.position, page: best.page })
  }
  return matches
}
