'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import type { TaskComment } from '@/types'

export function TaskCommentsDialog({
  taskId,
  actionNumber,
  canComment,
}: {
  taskId: string
  actionNumber: string
  canComment: boolean
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [comments, setComments] = useState<TaskComment[]>([])
  const [draft, setDraft] = useState('')
  const [posting, setPosting] = useState(false)
  const router = useRouter()

  async function load() {
    setLoading(true)
    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`)
      if (res.ok) {
        const body = await res.json()
        setComments(body.comments ?? [])
      }
    } finally {
      setLoading(false)
    }
  }

  async function post() {
    if (!draft.trim()) return
    setPosting(true)
    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: draft.trim() }),
      })
      if (res.ok) {
        setDraft('')
        await load()
        router.refresh()
      }
    } finally {
      setPosting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next: boolean) => {
        setOpen(next)
        if (next) load()
      }}
    >
      <DialogTrigger render={<Button variant="ghost" size="sm">Comments</Button>} />
      <DialogContent>
        <DialogHeader><DialogTitle>{actionNumber} — Comments</DialogTitle></DialogHeader>
        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!loading && comments.length === 0 && (
          <p className="text-sm text-muted-foreground">No comments yet.</p>
        )}
        {!loading && comments.length > 0 && (
          <ul className="max-h-72 space-y-3 overflow-y-auto text-sm">
            {comments.map((c) => (
              <li key={c.id} className="border-b border-border pb-2 last:border-0">
                <div className="text-foreground">{c.body}</div>
                <div className="text-xs text-muted-foreground">
                  {c.author_profile?.full_name ?? 'Someone'} · {new Date(c.created_at).toLocaleString()}
                </div>
              </li>
            ))}
          </ul>
        )}
        {canComment && (
          <DialogFooter className="flex-col items-stretch gap-2 sm:flex-col">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Add a comment…"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !posting) post()
              }}
            />
            <Button disabled={posting || !draft.trim()} onClick={post} className="self-end">
              {posting ? 'Posting…' : 'Post'}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
