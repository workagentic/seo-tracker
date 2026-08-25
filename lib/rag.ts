import type { RAGStatus } from '@/types'

export function calculateRAG(actual: number | null | undefined, target: number): RAGStatus {
  if (actual === null || actual === undefined) return 'no-data'
  const pct = actual / target
  if (pct >= 0.95) return 'green'
  if (pct >= 0.8) return 'amber'
  return 'red'
}
