import sanitizeHtml from 'sanitize-html'

// Server-side allowlist sanitizer for tasks.notes (CLAUDE.md Section 14 follow-up, 3 Sep
// 2026). The Notes editor (components/tasks/notes-editor.tsx) only ever produces <p>/<br>/<img>
// via its trimmed Tiptap schema, but this guards PATCH /api/tasks/[id] itself against a
// crafted request that bypasses the editor UI entirely and sends arbitrary HTML/scripts.
export function sanitizeNotesHtml(value: string): string {
  return sanitizeHtml(value, {
    allowedTags: ['p', 'br', 'img'],
    allowedAttributes: { img: ['src', 'alt'] },
    allowedSchemes: ['http', 'https'],
  })
}
