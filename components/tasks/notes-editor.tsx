'use client'

import { useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import { uploadTaskImage, imageFilesFromClipboard } from '@/lib/tasks/upload-image'
import { notesToEditableHtml } from '@/lib/tasks/notes-html'

// Minimal Word-like Notes editor (CLAUDE.md Section 14 follow-up, 3 Sep 2026): paragraphs and
// inline pasted screenshots only -- no formatting toolbar (no bold/italic/lists/headings),
// per Abdullah's explicit scope call. StarterKit's marks/nodes beyond Paragraph/Text/HardBreak/
// History are disabled below rather than hand-assembling extensions, since StarterKit already
// handles keyboard shortcuts and paste rules correctly for the pieces we keep.
export function NotesEditor({
  value,
  onChange,
  editable,
}: {
  value: string
  onChange?: (html: string) => void
  editable: boolean
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bold: false,
        italic: false,
        strike: false,
        code: false,
        codeBlock: false,
        heading: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        blockquote: false,
        horizontalRule: false,
      }),
      Image.configure({ inline: true, allowBase64: false }),
    ],
    content: notesToEditableHtml(value),
    editable,
    editorProps: {
      attributes: {
        class:
          'min-h-[100px] rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:outline-none [&_img]:my-1 [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded',
      },
      handlePaste(view, event) {
        const files = imageFilesFromClipboard(event.clipboardData)
        if (files.length === 0) return false
        event.preventDefault()
        for (const file of files) {
          uploadTaskImage(file)
            .then((url) => {
              const { schema } = view.state
              const node = schema.nodes.image.create({ src: url })
              view.dispatch(view.state.tr.replaceSelectionWith(node))
            })
            .catch((err) => {
              alert(err instanceof Error ? err.message : 'Failed to upload image')
            })
        }
        return true
      },
    },
    onUpdate({ editor: current }) {
      onChange?.(current.getHTML())
    },
    // Tiptap's SSR content-mismatch warning doesn't apply here -- this component only ever
    // mounts client-side ('use client'), the editor has no server-rendered HTML to reconcile.
    immediatelyRender: false,
  })

  // task-detail-panel.tsx swaps `value` (task.notes) whenever a different task is opened --
  // sync the editor's content on that change without recreating the whole editor instance.
  useEffect(() => {
    if (!editor) return
    const html = notesToEditableHtml(value)
    if (html !== editor.getHTML()) editor.commands.setContent(html)
  }, [editor, value])

  useEffect(() => {
    editor?.setEditable(editable)
  }, [editor, editable])

  return <EditorContent editor={editor} />
}
