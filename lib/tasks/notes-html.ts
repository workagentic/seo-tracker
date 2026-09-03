// Wraps a legacy plain-text tasks.notes value into HTML paragraphs so it loads correctly in
// the Tiptap editor (components/tasks/notes-editor.tsx, CLAUDE.md Section 14 follow-up, 3 Sep
// 2026) -- notes stored before this feature are plain text, not HTML, and Tiptap's `content`
// prop expects HTML. A value that already looks like HTML (starts with a tag, i.e. was already
// written by the editor) is passed through untouched.
export function notesToEditableHtml(value: string | null | undefined): string {
  if (!value) return ''
  const trimmed = value.trim()
  if (trimmed.startsWith('<')) return value

  const escaped = trimmed
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  return escaped
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, '<br>')}</p>`)
    .join('')
}
