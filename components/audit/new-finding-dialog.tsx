'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'

export function NewFindingDialog() {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [finding, setFinding] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()

  async function handleSubmit() {
    setSubmitting(true)
    try {
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, finding }),
      })
      if (res.ok) {
        setOpen(false)
        setTitle('')
        setFinding('')
        router.refresh()
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button>New finding</Button>} />
      <DialogContent>
        <DialogHeader><DialogTitle>New audit finding</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea placeholder="Finding details" value={finding} onChange={(e) => setFinding(e.target.value)} />
        </div>
        <DialogFooter>
          <Button disabled={submitting || !title || !finding} onClick={handleSubmit}>
            {submitting ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
