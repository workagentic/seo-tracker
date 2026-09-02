'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { getVisibleStages } from '@/lib/leads'
import type { Lead, LeadBrand, LeadSourceWithOptions, LeadStage } from '@/types'

type FormState = Omit<Lead, 'id' | 'created_by' | 'updated_by' | 'created_at' | 'updated_at' | 'source'>

const BRANDS: { value: LeadBrand; label: string }[] = [
  { value: 'workagentic', label: 'WorkAgentic' },
  { value: 'expertise_accelerated', label: 'Expertise Accelerated' },
]

function toFormState(lead: Lead): FormState {
  // Explicit field list rather than a rest-destructure (this project's ESLint config doesn't
  // set ignoreRestSiblings, so `const { id: _id, ... } = lead` fails no-unused-vars). This is
  // also stricter: TypeScript errors here if FormState's shape ever drifts from Lead's.
  return {
    stage: lead.stage,
    lead_date: lead.lead_date,
    full_name: lead.full_name,
    company_name: lead.company_name,
    email: lead.email,
    phone_number: lead.phone_number,
    revenue: lead.revenue,
    service_needed: lead.service_needed,
    brand: lead.brand,
    employee_size: lead.employee_size,
    source_id: lead.source_id,
    point_of_contact: lead.point_of_contact,
    submission_from_id: lead.submission_from_id,
    intro_call_date: lead.intro_call_date,
    intro_call_status: lead.intro_call_status,
    intro_call_meeting_minutes: lead.intro_call_meeting_minutes,
    intro_call_email_sent: lead.intro_call_email_sent,
    followup_1_scheduled_date: lead.followup_1_scheduled_date,
    followup_1_date: lead.followup_1_date,
    followup_1_notes: lead.followup_1_notes,
    followup_1_email_sent: lead.followup_1_email_sent,
    followup_2_scheduled_date: lead.followup_2_scheduled_date,
    followup_2_date: lead.followup_2_date,
    followup_2_notes: lead.followup_2_notes,
    followup_2_email_sent: lead.followup_2_email_sent,
    followup_3_scheduled_date: lead.followup_3_scheduled_date,
    followup_3_date: lead.followup_3_date,
    followup_3_notes: lead.followup_3_notes,
    followup_3_email_sent: lead.followup_3_email_sent,
    won_date: lead.won_date,
    won_notes: lead.won_notes,
    conversion_value: lead.conversion_value,
    lost_date: lead.lost_date,
    lost_notes: lead.lost_notes,
  }
}

export function LeadDetailDialog({
  lead,
  sources,
  onClose,
}: {
  lead: Lead | null
  sources: LeadSourceWithOptions[]
  onClose: () => void
}) {
  const [form, setForm] = useState<FormState | null>(lead ? toFormState(lead) : null)
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setForm(lead ? toFormState(lead) : null)
  }, [lead])

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => (f ? { ...f, [key]: value } : f))
  }

  function setSourceId(value: string) {
    const nextSource = sources.find((s) => s.id === value)
    setForm((f) =>
      f
        ? {
            ...f,
            source_id: value || null,
            submission_from_id: nextSource?.requires_submission_from ? f.submission_from_id : null,
          }
        : f
    )
  }

  async function handleDelete() {
    if (!lead) return
    if (!confirm(`Delete lead "${lead.full_name}"? This cannot be undone.`)) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/leads/${lead.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        alert(body.error ?? 'Failed to delete lead')
        return
      }
      onClose()
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSave() {
    if (!lead || !form) return
    setSubmitting(true)
    try {
      const payload = {
        stage: form.stage,
        lead_date: form.lead_date,
        full_name: form.full_name,
        company_name: form.company_name || null,
        email: form.email || null,
        phone_number: form.phone_number || null,
        revenue: form.revenue,
        service_needed: form.service_needed || null,
        brand: form.brand || null,
        employee_size: form.employee_size || null,
        source_id: form.source_id || null,
        point_of_contact: form.point_of_contact || null,
        submission_from_id: form.submission_from_id || null,
        intro_call_date: form.intro_call_date || null,
        intro_call_status: form.intro_call_status || null,
        intro_call_meeting_minutes: form.intro_call_meeting_minutes || null,
        intro_call_email_sent: form.intro_call_email_sent || null,
        followup_1_scheduled_date: form.followup_1_scheduled_date || null,
        followup_1_date: form.followup_1_date || null,
        followup_1_notes: form.followup_1_notes || null,
        followup_1_email_sent: form.followup_1_email_sent || null,
        followup_2_scheduled_date: form.followup_2_scheduled_date || null,
        followup_2_date: form.followup_2_date || null,
        followup_2_notes: form.followup_2_notes || null,
        followup_2_email_sent: form.followup_2_email_sent || null,
        followup_3_scheduled_date: form.followup_3_scheduled_date || null,
        followup_3_date: form.followup_3_date || null,
        followup_3_notes: form.followup_3_notes || null,
        followup_3_email_sent: form.followup_3_email_sent || null,
        won_date: form.won_date || null,
        won_notes: form.won_notes || null,
        conversion_value: form.conversion_value,
        lost_date: form.lost_date || null,
        lost_notes: form.lost_notes || null,
      }
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        alert(body.error ?? 'Failed to save lead')
        return
      }
      onClose()
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  if (!lead || !form) return null
  const visibleStages = getVisibleStages(form.stage)
  const shows = (stage: LeadStage) => visibleStages.includes(stage)
  const selectedSource = sources.find((s) => s.id === form.source_id)

  return (
    <Dialog open={!!lead} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{lead.full_name}</DialogTitle></DialogHeader>
        <div className="max-h-[70vh] space-y-5 overflow-y-auto">
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">New Lead</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="detail_lead_date">Date</Label>
                <Input id="detail_lead_date" type="date" value={form.lead_date} onChange={(e) => set('lead_date', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="detail_full_name">Full name</Label>
                <Input id="detail_full_name" value={form.full_name} onChange={(e) => set('full_name', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="detail_company_name">Company</Label>
                <Input id="detail_company_name" value={form.company_name ?? ''} onChange={(e) => set('company_name', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="detail_email">Email</Label>
                <Input id="detail_email" value={form.email ?? ''} onChange={(e) => set('email', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="detail_phone_number">Phone</Label>
                <Input id="detail_phone_number" value={form.phone_number ?? ''} onChange={(e) => set('phone_number', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="detail_revenue">Revenue</Label>
                <Input
                  id="detail_revenue"
                  type="number"
                  value={form.revenue ?? ''}
                  onChange={(e) => set('revenue', e.target.value === '' ? null : Number(e.target.value))}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="detail_service_needed">Service needed</Label>
              <Input id="detail_service_needed" value={form.service_needed ?? ''} onChange={(e) => set('service_needed', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="detail_brand">Brand</Label>
                <select
                  id="detail_brand"
                  value={form.brand ?? ''}
                  onChange={(e) => set('brand', e.target.value as LeadBrand)}
                  className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                >
                  <option value="">—</option>
                  {BRANDS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="detail_employee_size">Employee size</Label>
                <Input id="detail_employee_size" value={form.employee_size ?? ''} onChange={(e) => set('employee_size', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="detail_source_id">Source</Label>
                <select
                  id="detail_source_id"
                  value={form.source_id ?? ''}
                  onChange={(e) => setSourceId(e.target.value)}
                  className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                >
                  <option value="">—</option>
                  {sources.filter((s) => s.is_active).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="detail_point_of_contact">Point of contact</Label>
                <Input id="detail_point_of_contact" value={form.point_of_contact ?? ''} onChange={(e) => set('point_of_contact', e.target.value)} />
              </div>
            </div>
            {selectedSource?.requires_submission_from && (
              <div className="space-y-1">
                <Label htmlFor="detail_submission_from">Submission from</Label>
                <select
                  id="detail_submission_from"
                  value={form.submission_from_id ?? ''}
                  onChange={(e) => set('submission_from_id', e.target.value)}
                  className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                >
                  <option value="">—</option>
                  {selectedSource.submission_options.filter((o) => o.is_active).map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
              </div>
            )}
          </section>

          {shows('introductory_call') && (
            <section className="space-y-3 border-t border-border pt-4">
              <h3 className="text-sm font-semibold text-foreground">Introductory Call</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="intro_call_date">Date</Label>
                  <Input id="intro_call_date" type="date" value={form.intro_call_date ?? ''} onChange={(e) => set('intro_call_date', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="intro_call_status">Status</Label>
                  <select
                    id="intro_call_status"
                    value={form.intro_call_status ?? ''}
                    onChange={(e) => set('intro_call_status', e.target.value as 'conducted' | 'pending')}
                    className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                  >
                    <option value="">—</option>
                    <option value="pending">Pending</option>
                    <option value="conducted">Conducted</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="intro_call_meeting_minutes">Meeting minutes</Label>
                <Textarea id="intro_call_meeting_minutes" value={form.intro_call_meeting_minutes ?? ''} onChange={(e) => set('intro_call_meeting_minutes', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="intro_call_email_sent">Email sent</Label>
                <Textarea id="intro_call_email_sent" value={form.intro_call_email_sent ?? ''} onChange={(e) => set('intro_call_email_sent', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="followup_1_scheduled_date">1st follow-up scheduled date</Label>
                <Input id="followup_1_scheduled_date" type="date" value={form.followup_1_scheduled_date ?? ''} onChange={(e) => set('followup_1_scheduled_date', e.target.value)} />
              </div>
            </section>
          )}

          {shows('followup_1') && (
            <section className="space-y-3 border-t border-border pt-4">
              <h3 className="text-sm font-semibold text-foreground">1st Follow-up</h3>
              <div className="space-y-1">
                <Label htmlFor="followup_1_date">Date</Label>
                <Input id="followup_1_date" type="date" value={form.followup_1_date ?? ''} onChange={(e) => set('followup_1_date', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="followup_1_notes">Notes</Label>
                <Textarea id="followup_1_notes" value={form.followup_1_notes ?? ''} onChange={(e) => set('followup_1_notes', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="followup_1_email_sent">Email sent</Label>
                <Textarea id="followup_1_email_sent" value={form.followup_1_email_sent ?? ''} onChange={(e) => set('followup_1_email_sent', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="followup_2_scheduled_date">2nd follow-up scheduled date</Label>
                <Input id="followup_2_scheduled_date" type="date" value={form.followup_2_scheduled_date ?? ''} onChange={(e) => set('followup_2_scheduled_date', e.target.value)} />
              </div>
            </section>
          )}

          {shows('followup_2') && (
            <section className="space-y-3 border-t border-border pt-4">
              <h3 className="text-sm font-semibold text-foreground">2nd Follow-up</h3>
              <div className="space-y-1">
                <Label htmlFor="followup_2_date">Date</Label>
                <Input id="followup_2_date" type="date" value={form.followup_2_date ?? ''} onChange={(e) => set('followup_2_date', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="followup_2_notes">Notes</Label>
                <Textarea id="followup_2_notes" value={form.followup_2_notes ?? ''} onChange={(e) => set('followup_2_notes', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="followup_2_email_sent">Email sent</Label>
                <Textarea id="followup_2_email_sent" value={form.followup_2_email_sent ?? ''} onChange={(e) => set('followup_2_email_sent', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="followup_3_scheduled_date">3rd follow-up scheduled date</Label>
                <Input id="followup_3_scheduled_date" type="date" value={form.followup_3_scheduled_date ?? ''} onChange={(e) => set('followup_3_scheduled_date', e.target.value)} />
              </div>
            </section>
          )}

          {shows('followup_3') && (
            <section className="space-y-3 border-t border-border pt-4">
              <h3 className="text-sm font-semibold text-foreground">3rd Follow-up</h3>
              <div className="space-y-1">
                <Label htmlFor="followup_3_date">Date</Label>
                <Input id="followup_3_date" type="date" value={form.followup_3_date ?? ''} onChange={(e) => set('followup_3_date', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="followup_3_notes">Notes</Label>
                <Textarea id="followup_3_notes" value={form.followup_3_notes ?? ''} onChange={(e) => set('followup_3_notes', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="followup_3_email_sent">Email sent</Label>
                <Textarea id="followup_3_email_sent" value={form.followup_3_email_sent ?? ''} onChange={(e) => set('followup_3_email_sent', e.target.value)} />
              </div>
            </section>
          )}

          {shows('won') && (
            <section className="space-y-3 border-t border-border pt-4">
              <h3 className="text-sm font-semibold text-foreground">Won</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="won_date">Date</Label>
                  <Input id="won_date" type="date" value={form.won_date ?? ''} onChange={(e) => set('won_date', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="conversion_value">Conversion value</Label>
                  <Input
                    id="conversion_value"
                    type="number"
                    value={form.conversion_value ?? ''}
                    onChange={(e) => set('conversion_value', e.target.value === '' ? null : Number(e.target.value))}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="won_notes">Notes</Label>
                <Textarea id="won_notes" value={form.won_notes ?? ''} onChange={(e) => set('won_notes', e.target.value)} />
              </div>
            </section>
          )}

          {shows('lost') && (
            <section className="space-y-3 border-t border-border pt-4">
              <h3 className="text-sm font-semibold text-foreground">Lost</h3>
              <div className="space-y-1">
                <Label htmlFor="lost_date">Date</Label>
                <Input id="lost_date" type="date" value={form.lost_date ?? ''} onChange={(e) => set('lost_date', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="lost_notes">Notes</Label>
                <Textarea id="lost_notes" value={form.lost_notes ?? ''} onChange={(e) => set('lost_notes', e.target.value)} />
              </div>
            </section>
          )}
        </div>
        <DialogFooter className="sm:justify-between">
          <Button variant="destructive" disabled={submitting} onClick={handleDelete}>
            Delete
          </Button>
          <Button disabled={submitting || !form.lead_date || !form.full_name} onClick={handleSave}>
            {submitting ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
