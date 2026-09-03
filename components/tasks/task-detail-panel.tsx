'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X } from 'lucide-react'
import { TaskFields, emptyTaskForm } from './task-fields'
import { TaskStatusSelect } from './task-status-select'
import { NotesEditor } from './notes-editor'
import { canEditTaskStatus, canCommentOnTask, getAllowedStatuses } from '@/lib/tasks/permissions'
import { uploadTaskImage, imageFilesFromClipboard } from '@/lib/tasks/upload-image'
import type { Profile, Task, TaskActivity, TaskComment } from '@/types'

const FIELD_LABELS: Record<string, string> = {
  status: 'Status',
  notes: 'Notes',
  action_number: 'Action number',
  title: 'Title',
  description: 'Description',
  position_responsible: 'Position responsible',
  owner_id: 'Owner',
  assigned_to_id: 'Assigned to',
  due_date: 'Due date',
  deadline: 'Deadline',
  quarter: 'Quarter',
  category_id: 'Category',
  link_url: 'Link',
  repeats: 'Repeats',
  next_due: 'Next due',
  linked_finding_id: 'Linked Audit finding',
  linked_keyword_id: 'Linked keyword',
}

function nameOf(list: { id: string; full_name: string }[], id: string | null): string {
  if (!id) return '—'
  return list.find((p) => p.id === id)?.full_name ?? '—'
}

function CommentRow({
  comment,
  currentProfile,
  onChanged,
  canModify,
}: {
  comment: TaskComment
  currentProfile: Profile
  onChanged: () => void
  // Whether this viewer currently has any edit rights on the task at all (false once a task
  // is locked -- Completed/On Hold -- and the viewer isn't the Owner or admin/senior, CLAUDE.md
  // Section 14 follow-up, 3 Sep 2026). Gates editing/deleting their OWN past comment; admin/
  // senior's moderation delete of ANY comment is unaffected.
  canModify: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(comment.body)
  const [busy, setBusy] = useState(false)
  const isAuthor = comment.author_id === currentProfile.id
  const canDelete = (isAuthor && canModify) || ['admin', 'senior'].includes(currentProfile.role)
  const canEditOwn = isAuthor && canModify

  async function save() {
    if (!draft.trim()) return
    setBusy(true)
    try {
      const res = await fetch(`/api/tasks/${comment.task_id}/comments/${comment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: draft.trim() }),
      })
      if (res.ok) {
        setEditing(false)
        onChanged()
      }
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!confirm('Delete this comment?')) return
    setBusy(true)
    try {
      const res = await fetch(`/api/tasks/${comment.task_id}/comments/${comment.id}`, { method: 'DELETE' })
      if (res.ok) onChanged()
    } finally {
      setBusy(false)
    }
  }

  if (comment.deleted_at) {
    return (
      <li className="border-b border-border pb-2 text-sm italic text-muted-foreground last:border-0">
        [comment deleted]
      </li>
    )
  }

  return (
    <li className="border-b border-border pb-2 text-sm last:border-0">
      {editing ? (
        <div className="space-y-2">
          <Input value={draft} onChange={(e) => setDraft(e.target.value)} disabled={busy} />
          <div className="flex gap-2">
            <Button size="xs" disabled={busy || !draft.trim()} onClick={save}>Save</Button>
            <Button size="xs" variant="ghost" disabled={busy} onClick={() => { setEditing(false); setDraft(comment.body) }}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <>
          {comment.body && <div className="whitespace-pre-wrap text-foreground">{comment.body}</div>}
          {comment.images && comment.images.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {comment.images.map((img) => (
                <a key={img.id} href={img.image_url} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element -- pasted screenshots served from Supabase Storage, not a build-time-known domain */}
                  <img src={img.image_url} alt="Attached screenshot" className="h-20 w-20 rounded border border-border object-cover" />
                </a>
              ))}
            </div>
          )}
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <span>
              {comment.author_profile?.full_name ?? 'Someone'} · {new Date(comment.created_at).toLocaleString()}
              {comment.edited_at && ' (edited)'}
            </span>
            {canEditOwn && (
              <button type="button" className="text-indigo-600 hover:underline" onClick={() => setEditing(true)}>
                Edit
              </button>
            )}
            {canDelete && (
              <button type="button" className="text-destructive hover:underline" onClick={remove} disabled={busy}>
                Delete
              </button>
            )}
          </div>
        </>
      )}
    </li>
  )
}

export function TaskDetailPanel({
  task,
  currentProfile,
  owners,
  categories = [],
  findings = [],
  keywords = [],
  onClose,
}: {
  task: Task | null
  currentProfile: Profile
  owners: { id: string; full_name: string }[]
  categories?: { id: string; name: string }[]
  findings?: { id: string; title: string }[]
  keywords?: { id: string; keyword: string }[]
  onClose: () => void
}) {
  const router = useRouter()
  // Senior gets the same full structural-edit + delete rights as admin here (CLAUDE.md
  // Section 14) -- near-admin for task management, not just admin-tab visibility.
  const canEditStructural = currentProfile.role === 'admin' || currentProfile.role === 'senior'
  // canEditTaskStatus already covers admin/senior internally -- no need to repeat that check.
  const canEditAssignment = !!task && canEditTaskStatus(task, currentProfile)
  // Owner is admin-only to change on an existing task -- senior is fixed as Owner only at
  // creation time (CLAUDE.md Section 14 follow-up, 3 Sep 2026). Shown as a fixed display of
  // the task's current Owner (not necessarily this viewer) rather than a select.
  const canEditOwner = currentProfile.role === 'admin'
  const ownerLockedTo =
    canEditStructural && !canEditOwner && task
      ? { id: task.owner_id ?? '', full_name: task.owner_profile?.full_name ?? '—' }
      : null

  const [form, setForm] = useState(emptyTaskForm(task ?? undefined))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reassignTo, setReassignTo] = useState(task?.assigned_to_id ?? '')
  const [reassignDeadline, setReassignDeadline] = useState(task?.deadline ?? '')
  const [notes, setNotes] = useState(task?.notes ?? '')

  const [comments, setComments] = useState<TaskComment[]>([])
  const [loadingComments, setLoadingComments] = useState(false)
  const [draft, setDraft] = useState('')
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [posting, setPosting] = useState(false)
  // Screenshots pasted into the comment box, already uploaded, attached when the comment is
  // posted (CLAUDE.md Section 14 follow-up, 3 Sep 2026) -- fixed once posted, see CommentRow.
  const [pendingImages, setPendingImages] = useState<string[]>([])
  const [uploadingCount, setUploadingCount] = useState(0)

  const [activity, setActivity] = useState<TaskActivity[]>([])
  const [loadingActivity, setLoadingActivity] = useState(false)

  useEffect(() => {
    if (!task) return
    setForm(emptyTaskForm(task))
    setReassignTo(task.assigned_to_id ?? '')
    setReassignDeadline(task.deadline ?? '')
    setNotes(task.notes ?? '')
    setError(null)
    setDraft('')
    setPendingImages([])
    loadComments(task.id)
    loadActivity(task.id)
    // Deliberately keyed on task?.id, not the task object itself -- `task` is a fresh object
    // reference on every parent render (task-list.tsx re-derives it via tasks.find()), and
    // resetting local edit/comment state on every unrelated re-render would fight the user's
    // own typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task?.id])

  async function loadComments(taskId: string) {
    setLoadingComments(true)
    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`)
      if (res.ok) {
        const body = await res.json()
        setComments(body.comments ?? [])
      }
    } finally {
      setLoadingComments(false)
    }
  }

  async function loadActivity(taskId: string) {
    setLoadingActivity(true)
    try {
      const res = await fetch(`/api/tasks/${taskId}/activity`)
      if (res.ok) {
        const body = await res.json()
        setActivity(body.activity ?? [])
      }
    } finally {
      setLoadingActivity(false)
    }
  }

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function saveDetails() {
    if (!task) return
    if (form.deadline && form.due_date && form.deadline > form.due_date) {
      setError('Deadline cannot be later than the Due date')
      return
    }
    setError(null)
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        title: form.title,
        description: form.description || null,
        assigned_to_id: form.assigned_to_id || null,
        due_date: form.due_date || null,
        deadline: form.deadline || null,
        quarter: form.quarter || null,
        category_id: form.category_id || null,
        link_url: form.link_url || null,
        repeats: form.repeats || null,
        next_due: form.next_due || null,
        linked_finding_id: form.linked_finding_id || null,
        linked_keyword_id: form.linked_keyword_id || null,
      }
      // Owner is admin-only to change -- senior never sends it, even unchanged, since the API
      // now rejects any owner_id from a non-admin (CLAUDE.md Section 14 follow-up, 3 Sep 2026).
      if (canEditOwner) payload.owner_id = form.owner_id || null
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.error ?? 'Failed to save task')
        return
      }
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  async function saveReassignment() {
    if (!task || !reassignTo) return
    if (reassignDeadline && task.due_date && reassignDeadline > task.due_date) {
      setError('Deadline cannot be later than the Due date')
      return
    }
    setError(null)
    setSaving(true)
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigned_to_id: reassignTo, deadline: reassignDeadline || null }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.error ?? 'Failed to reassign task')
        return
      }
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  async function saveNotes() {
    if (!task) return
    setSaving(true)
    try {
      await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      })
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!task) return
    if (!confirm(`Delete task "${task.title}"? This cannot be undone.`)) return
    setSaving(true)
    try {
      const res = await fetch(`/api/tasks/${task.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        alert(body.error ?? 'Failed to delete task')
        return
      }
      onClose()
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  function handleDraftChange(value: string) {
    setDraft(value)
    const match = value.match(/@([A-Za-z ]*)$/)
    setMentionQuery(match ? match[1] : null)
  }

  function selectMention(name: string) {
    setDraft((d) => d.replace(/@([A-Za-z ]*)$/, `@${name} `))
    setMentionQuery(null)
  }

  // No cap -- this is a 9-person team, and the dropdown itself scrolls (see the mention <ul>
  // below) rather than silently truncating the match list to 5 (bug reported by Abdullah 3 Sep
  // 2026).
  const mentionSuggestions =
    mentionQuery !== null
      ? owners.filter((o) => o.full_name.toLowerCase().startsWith(mentionQuery.toLowerCase()))
      : []

  async function postComment() {
    if (!task || (!draft.trim() && pendingImages.length === 0)) return
    setPosting(true)
    try {
      const res = await fetch(`/api/tasks/${task.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: draft.trim(), image_urls: pendingImages }),
      })
      if (res.ok) {
        setDraft('')
        setPendingImages([])
        setMentionQuery(null)
        await loadComments(task.id)
        router.refresh()
      }
    } finally {
      setPosting(false)
    }
  }

  // Pasting an image into the comment box (even a plain <input>) fires a paste event carrying
  // the image as a file, even though no text gets inserted -- same mechanism GitHub/Slack use.
  async function handleCommentPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const files = imageFilesFromClipboard(e.clipboardData)
    if (files.length === 0) return
    e.preventDefault()
    setUploadingCount((n) => n + files.length)
    try {
      const urls = await Promise.all(files.map((file) => uploadTaskImage(file)))
      setPendingImages((prev) => [...prev, ...urls])
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to upload image')
    } finally {
      setUploadingCount((n) => n - files.length)
    }
  }

  function removePendingImage(url: string) {
    setPendingImages((prev) => prev.filter((u) => u !== url))
  }

  // Any role can comment normally (reviewer included -- within Tasks, reviewer's permissions
  // match expert's, CLAUDE.md Section 14); once the task is locked (Completed/On Hold), only
  // the Owner and admin/senior retain that (Section 14 follow-up, 3 Sep 2026).
  const canComment = !!task && canCommentOnTask(task, currentProfile)
  const allowedStatuses = task ? getAllowedStatuses(task, currentProfile) : []
  const canEditNotes = canEditAssignment

  return (
    <Sheet open={!!task} onOpenChange={(next) => !next && onClose()}>
      <SheetContent side="right" className="data-[side=right]:w-1/2 data-[side=right]:sm:max-w-[50vw]">
        {task && (
          <>
            <SheetHeader className="border-b border-border">
              <SheetTitle>{task.action_number ? `${task.action_number} — ${task.title}` : task.title}</SheetTitle>
            </SheetHeader>
            <div className="flex-1 space-y-6 overflow-y-auto px-4 pb-4">
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">Status</h3>
                  <TaskStatusSelect
                    taskId={task.id}
                    status={task.status}
                    allowedStatuses={allowedStatuses}
                    disabled={allowedStatuses.length === 0}
                    linkedFindingTitle={task.linked_finding?.title ?? null}
                  />
                </div>

                {!canEditStructural && !canEditAssignment && (task.status === 'completed' || task.status === 'on_hold') && (
                  <p className="text-xs text-muted-foreground">
                    This task is locked while {task.status === 'completed' ? 'Completed' : 'On Hold'} — only the
                    Owner can make changes until it&apos;s moved back to Pending or In Progress.
                  </p>
                )}

                {!canEditStructural && canEditAssignment && (
                  <div className="rounded-md border border-border bg-muted/30 p-3">
                    <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Reassign</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={reassignTo}
                        onChange={(e) => setReassignTo(e.target.value)}
                        className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm"
                      >
                        <option value="">—</option>
                        <option value={currentProfile.id}>Myself</option>
                        {owners.filter((o) => o.id !== currentProfile.id).map((o) => <option key={o.id} value={o.id}>{o.full_name}</option>)}
                      </select>
                      <Input
                        type="date"
                        value={reassignDeadline ?? ''}
                        max={task.due_date ?? undefined}
                        onChange={(e) => setReassignDeadline(e.target.value)}
                      />
                    </div>
                    <Button size="sm" className="mt-2" disabled={saving || !reassignTo} onClick={saveReassignment}>
                      Save
                    </Button>
                  </div>
                )}
              </section>

              <section className="space-y-3 border-t border-border pt-4">
                <h3 className="text-sm font-semibold text-foreground">Details</h3>
                {canEditStructural ? (
                  <>
                    <TaskFields form={form} set={set} owners={owners} categories={categories} findings={findings} keywords={keywords} idPrefix="panel_" lockOwnerTo={ownerLockedTo} />
                    {error && <p className="text-sm text-destructive">{error}</p>}
                    <div className="flex gap-2">
                      <Button size="sm" disabled={saving || !form.title} onClick={saveDetails}>
                        {saving ? 'Saving…' : 'Save'}
                      </Button>
                      <Button size="sm" variant="destructive" disabled={saving} onClick={handleDelete}>
                        Delete task
                      </Button>
                    </div>
                  </>
                ) : (
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div><dt className="text-muted-foreground">Owner</dt><dd className="text-foreground">{task.owner_profile?.full_name ?? '—'}</dd></div>
                    <div><dt className="text-muted-foreground">Assigned to</dt><dd className="text-foreground">{task.assigned_to_profile?.full_name ?? '—'}</dd></div>
                    <div><dt className="text-muted-foreground">Due date</dt><dd className="text-foreground">{task.due_date ?? '—'}</dd></div>
                    <div><dt className="text-muted-foreground">Deadline</dt><dd className="text-foreground">{task.deadline ?? '—'}</dd></div>
                    <div><dt className="text-muted-foreground">Category</dt><dd className="text-foreground">{task.category?.name ?? '—'}</dd></div>
                    <div><dt className="text-muted-foreground">Quarter</dt><dd className="text-foreground">{task.quarter ?? '—'}</dd></div>
                    {task.description && (
                      <div className="col-span-2"><dt className="text-muted-foreground">Description</dt><dd className="text-foreground">{task.description}</dd></div>
                    )}
                    {task.link_url && (
                      <div className="col-span-2">
                        <dt className="text-muted-foreground">Link</dt>
                        <dd><a href={task.link_url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">{task.link_url}</a></dd>
                      </div>
                    )}
                  </dl>
                )}
              </section>

              <section className="space-y-2 border-t border-border pt-4">
                <h3 className="text-sm font-semibold text-foreground">Notes</h3>
                <NotesEditor value={notes} onChange={setNotes} editable={canEditNotes} />
                {canEditNotes && (
                  <Button size="sm" disabled={saving} onClick={saveNotes}>Save notes</Button>
                )}
              </section>

              <section className="space-y-3 border-t border-border pt-4">
                <h3 className="text-sm font-semibold text-foreground">Comments</h3>
                {loadingComments && <p className="text-sm text-muted-foreground">Loading…</p>}
                {!loadingComments && comments.length === 0 && (
                  <p className="text-sm text-muted-foreground">No comments yet.</p>
                )}
                {!loadingComments && comments.length > 0 && (
                  <ul className="space-y-3">
                    {comments.map((c) => (
                      <CommentRow key={c.id} comment={c} currentProfile={currentProfile} onChanged={() => loadComments(task.id)} canModify={canComment} />
                    ))}
                  </ul>
                )}
                {!canComment && (task.status === 'completed' || task.status === 'on_hold') && (
                  <p className="text-xs text-muted-foreground">
                    Commenting is locked while this task is {task.status === 'completed' ? 'Completed' : 'On Hold'}.
                  </p>
                )}
                {canComment && (
                  <div className="relative space-y-2">
                    <Input
                      value={draft}
                      onChange={(e) => handleDraftChange(e.target.value)}
                      onPaste={handleCommentPaste}
                      placeholder="Add a comment… (@ to mention someone, or paste a screenshot)"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !posting && mentionSuggestions.length === 0) postComment()
                      }}
                    />
                    {mentionSuggestions.length > 0 && (
                      <ul className="absolute z-10 max-h-48 w-full overflow-y-auto rounded-md border border-border bg-popover shadow-md">
                        {mentionSuggestions.map((o) => (
                          <li key={o.id}>
                            <button
                              type="button"
                              className="block w-full px-3 py-1.5 text-left text-sm hover:bg-muted"
                              onClick={() => selectMention(o.full_name)}
                            >
                              {o.full_name}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    {pendingImages.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {pendingImages.map((url) => (
                          <div key={url} className="relative">
                            {/* eslint-disable-next-line @next/next/no-img-element -- pasted screenshots served from Supabase Storage, not a build-time-known domain */}
                            <img src={url} alt="Pasted screenshot" className="h-16 w-16 rounded border border-border object-cover" />
                            <button
                              type="button"
                              onClick={() => removePendingImage(url)}
                              aria-label="Remove image"
                              className="absolute -right-1.5 -top-1.5 rounded-full bg-destructive p-0.5 text-destructive-foreground"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {uploadingCount > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Uploading {uploadingCount} image{uploadingCount > 1 ? 's' : ''}…
                      </p>
                    )}
                    <Button
                      size="sm"
                      disabled={posting || uploadingCount > 0 || (!draft.trim() && pendingImages.length === 0)}
                      onClick={postComment}
                      className="self-end"
                    >
                      {posting ? 'Posting…' : 'Post'}
                    </Button>
                  </div>
                )}
              </section>

              <section className="space-y-2 border-t border-border pt-4">
                <h3 className="text-sm font-semibold text-foreground">Activity History</h3>
                {loadingActivity && <p className="text-sm text-muted-foreground">Loading…</p>}
                {!loadingActivity && activity.length === 0 && (
                  <p className="text-sm text-muted-foreground">No changes recorded yet.</p>
                )}
                {!loadingActivity && activity.length > 0 && (
                  <ul className="space-y-2 text-sm">
                    {activity.map((entry) => (
                      <li key={entry.id} className="border-b border-border pb-2 last:border-0">
                        <div className="text-foreground">
                          <span className="font-medium">{entry.changed_by_profile?.full_name ?? 'Someone'}</span>{' '}
                          changed <span className="font-medium">{FIELD_LABELS[entry.field] ?? entry.field}</span>
                        </div>
                        <div className="font-mono text-xs text-muted-foreground">
                          {entry.field === 'owner_id' || entry.field === 'assigned_to_id'
                            ? `${nameOf(owners, entry.old_value)} → ${nameOf(owners, entry.new_value)}`
                            : entry.field === 'notes'
                              ? '(content updated)'
                              : `${entry.old_value ?? '—'} → ${entry.new_value ?? '—'}`}
                        </div>
                        <div className="text-xs text-muted-foreground">{new Date(entry.created_at).toLocaleString()}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
