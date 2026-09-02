export interface TaskActivityEntry {
  field: string
  old_value: string | null
  new_value: string | null
}

const TRACKED_FIELDS = [
  'status',
  'notes',
  'action_number',
  'title',
  'description',
  'position_responsible',
  'owner_id',
  'assigned_to_id',
  'due_date',
  'deadline',
  'quarter',
  'category_id',
  'link_url',
  'repeats',
  'next_due',
  'linked_finding_id',
  'linked_keyword_id',
] as const

type TrackedField = (typeof TRACKED_FIELDS)[number]

function toComparable(value: unknown): string | null {
  if (value === null || value === undefined) return null
  return String(value)
}

// Pure diff: given the task's current DB row and the subset of fields about to be written,
// returns one entry per field that actually changed. Fields not present in `updates` (i.e.
// not being touched by this PATCH) are ignored, and a value that's set to the same thing it
// already was produces no entry.
export function computeTaskActivityEntries(
  currentTask: Record<string, unknown>,
  updates: Record<string, unknown>
): TaskActivityEntry[] {
  const entries: TaskActivityEntry[] = []
  for (const field of TRACKED_FIELDS as readonly TrackedField[]) {
    if (!(field in updates)) continue
    const oldValue = toComparable(currentTask[field])
    const newValue = toComparable(updates[field])
    if (oldValue === newValue) continue
    entries.push({ field, old_value: oldValue, new_value: newValue })
  }
  return entries
}
