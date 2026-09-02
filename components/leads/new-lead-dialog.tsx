'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import type { LeadBrand, LeadSource, LeadSubmissionFrom } from '@/types'

const BRANDS: { value: LeadBrand; label: string }[] = [
  { value: 'workagentic', label: 'WorkAgentic' },
  { value: 'expertise_accelerated', label: 'Expertise Accelerated' },
]
const SUBMISSION_OPTIONS: { value: LeadSubmissionFrom; label: string }[] = [
  { value: 'book_a_consultation', label: 'Book A Consultation' },
  { value: 'contact_form', label: 'Contact Form' },
  { value: 'chat', label: 'Chat' },
]

export function NewLeadDialog({ sources }: { sources: LeadSource[] }) {
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    lead_date: new Date().toISOString().slice(0, 10),
    full_name: '',
    company_name: '',
    email: '',
    phone_number: '',
    revenue: '',
    service_needed: '',
    brand: '' as LeadBrand | '',
    employee_size: '',
    source_id: '',
    point_of_contact: '',
    submission_from: '' as LeadSubmissionFrom | '',
  })
  const router = useRouter()

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function setSourceId(value: string) {
    const nextSource = sources.find((s) => s.id === value)
    setForm((f) => ({
      ...f,
      source_id: value,
      submission_from: nextSource?.requires_submission_from ? f.submission_from : '',
    }))
  }

  const selectedSource = sources.find((s) => s.id === form.source_id)

  async function handleSubmit() {
    setSubmitting(true)
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          revenue: form.revenue ? Number(form.revenue) : null,
          brand: form.brand || null,
          source_id: form.source_id || null,
          submission_from: form.submission_from || null,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        alert(body.error ?? 'Failed to create lead')
        return
      }
      setOpen(false)
      setForm((f) => ({ ...f, full_name: '', company_name: '', email: '', phone_number: '' }))
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button>New Lead</Button>} />
      <DialogContent>
        <DialogHeader><DialogTitle>New lead</DialogTitle></DialogHeader>
        <div className="max-h-[70vh] space-y-3 overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="lead_date">Date</Label>
              <Input id="lead_date" type="date" value={form.lead_date} onChange={(e) => set('lead_date', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="full_name">Full name</Label>
              <Input id="full_name" value={form.full_name} onChange={(e) => set('full_name', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="company_name">Company name</Label>
              <Input id="company_name" value={form.company_name} onChange={(e) => set('company_name', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="phone_number">Phone number</Label>
              <Input id="phone_number" value={form.phone_number} onChange={(e) => set('phone_number', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="revenue">Revenue</Label>
              <Input id="revenue" type="number" value={form.revenue} onChange={(e) => set('revenue', e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="service_needed">Service needed</Label>
            <Input id="service_needed" value={form.service_needed} onChange={(e) => set('service_needed', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="brand">Brand</Label>
              <select
                id="brand"
                value={form.brand}
                onChange={(e) => set('brand', e.target.value as LeadBrand)}
                className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
              >
                <option value="">—</option>
                {BRANDS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="employee_size">Employee size</Label>
              <Input id="employee_size" value={form.employee_size} onChange={(e) => set('employee_size', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="source_id">Source</Label>
              <select
                id="source_id"
                value={form.source_id}
                onChange={(e) => setSourceId(e.target.value)}
                className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
              >
                <option value="">—</option>
                {sources.filter((s) => s.is_active).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="point_of_contact">Point of contact</Label>
              <Input id="point_of_contact" value={form.point_of_contact} onChange={(e) => set('point_of_contact', e.target.value)} />
            </div>
          </div>
          {selectedSource?.requires_submission_from && (
            <div className="space-y-1">
              <Label htmlFor="submission_from">Submission from</Label>
              <select
                id="submission_from"
                value={form.submission_from}
                onChange={(e) => set('submission_from', e.target.value as LeadSubmissionFrom)}
                className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
              >
                <option value="">—</option>
                {SUBMISSION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button disabled={submitting || !form.lead_date || !form.full_name} onClick={handleSubmit}>
            {submitting ? 'Creating…' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
