'use client'

export interface SortState {
  key: string
  dir: 'asc' | 'desc'
}

export function SortableTh({
  label,
  sortKey,
  currentSort,
  onSort,
  className,
}: {
  label: string
  sortKey: string
  currentSort: SortState | null
  onSort: (key: string) => void
  className?: string
}) {
  const isActive = currentSort?.key === sortKey
  return (
    <th
      className={`cursor-pointer select-none px-4 py-2 hover:text-foreground ${className ?? ''}`}
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <span className="w-3 text-[10px]">{isActive ? (currentSort.dir === 'asc' ? '▲' : '▼') : ''}</span>
      </span>
    </th>
  )
}

// Generic comparator: nulls/undefined always sort last regardless of direction.
export function compareValues(a: unknown, b: unknown, dir: 'asc' | 'desc'): number {
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1
  if (typeof a === 'number' && typeof b === 'number') return dir === 'asc' ? a - b : b - a
  const cmp = String(a).localeCompare(String(b))
  return dir === 'asc' ? cmp : -cmp
}
