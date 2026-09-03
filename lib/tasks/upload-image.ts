// Shared client helper for pasted screenshots on Comments and Notes (CLAUDE.md Section 14
// follow-up, 3 Sep 2026) -- both call this against the same POST /api/uploads/task-image route.
export async function uploadTaskImage(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch('/api/uploads/task-image', { method: 'POST', body: formData })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? 'Failed to upload image')
  }
  const body = await res.json()
  return body.url as string
}

// Extracts image files out of a clipboard paste event's DataTransfer, if any. Works for both
// a plain <input>/<textarea> paste event and a ProseMirror (Tiptap) paste event, since both
// expose a standard DataTransfer via clipboardData.
export function imageFilesFromClipboard(clipboardData: DataTransfer | null): File[] {
  if (!clipboardData) return []
  return Array.from(clipboardData.files).filter((f) => f.type.startsWith('image/'))
}
