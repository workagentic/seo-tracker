'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog'

export function AddCompetitorDialog() {
  const [open, setOpen] = useState(false)
  const [companyName, setCompanyName] = useState('')
  const [domain, setDomain] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()

  async function handleSubmit() {
    setSubmitting(true)
    try {
      const res = await fetch('/api/competitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_name: companyName, domain }),
      })
      if (res.ok) {
        setOpen(false)
        setCompanyName('')
        setDomain('')
        router.refresh()
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button>Add competitor</Button>} />
      <DialogContent>
        <DialogHeader><DialogTitle>Add competitor</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Company name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
          <Input placeholder="Domain (e.g. example.com)" value={domain} onChange={(e) => setDomain(e.target.value)} />
        </div>
        <DialogFooter>
          <Button disabled={submitting || !companyName || !domain} onClick={handleSubmit}>
            {submitting ? 'Adding…' : 'Add'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
