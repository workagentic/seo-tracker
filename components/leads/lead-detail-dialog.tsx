'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { getVisibleStages } from '@/lib/leads'
import type { Lead, LeadBrand, LeadSource, LeadStage, LeadSubmissionFrom } from '@/types'

type FormState = Omit<Lead, 'id' | 'created_by' | 'updated_by' | 'created_at' | 'updated_at' | 'source'>

const BRANDS: { value: LeadBrand; label: string }[] = [
  { value: 'workagentic', label: 'WorkAgentic' },
  { value: 'expertise_accelerated', label: 'Expertise Accelerated' },
]
const SUBMISSION_OPTIONS: { value: LeadSubmissionFrom; label: string }[] = [
  { value: 'book_a_consultation', label: 'Book A Consultation' },
  { value: 'contact_form', label: 'Contact Form' },
  { value: 'chat', label: 'Chat' },
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
    submission_from: lead.submission_from,
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
  sources: LeadSource[]
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
        submission_from: form.submission_from || null,
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
                <Label>Date</Label>
                <Input type="date" value={form.lead_date} onChange={(e) => set('lead_date', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Full name</Label>
                <Input value={form.full_name} onChange={(e) => set('full_name', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Company</Label>
                <Input value={form.company_name ?? ''} onChange={(e) => set('company_name', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input value={form.email ?? ''} onChange={(e) => set('email', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Phone</Label>
                <Input value={form.phone_number ?? ''} onChange={(e) => set('phone_number', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Revenue</Label>
                <Input
                  type="number"
                  value={form.revenue ?? ''}
                  onChange={(e) => set('revenue', e.target.value === '' ? null : Number(e.target.value))}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Service needed</Label>
              <Input value={form.service_needed ?? ''} onChange={(e) => set('service_needed', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Brand</Label>
                <select
                  value={form.brand ?? ''}
                  onChange={(e) => set('brand', e.target.value as LeadBrand)}
                  className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                >
                  <option value="">—</option>
                  {BRANDS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <Label>Employee size</Label>
                <Input value={form.employee_size ?? ''} onChange={(e) => set('employee_size', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Source</Label>
                <select
                  value={form.source_id ?? ''}
                  onChange={(e) => set('source_id', e.target.value || null)}
                  className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                >
                  <option value="">—</option>
                  {sources.filter((s) => s.is_active).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <Label>Point of contact</Label>
                <Input value={form.point_of_contact ?? ''} onChange={(e) => set('point_of_contact', e.target.value)} />
              </div>
            </div>
            {selectedSource?.requires_submission_from && (
              <div className="space-y-1">
                <Label>Submission from</Label>
                <select
                  value={form.submission_from ?? ''}
                  onChange={(e) => set('submission_from', e.target.value as LeadSubmissionFrom)}
                  className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                >
                  <option value="">—</option>
                  {SUBMISSION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            )}
          </section>

          {shows('introductory_call') && (
            <section className="space-y-3 border-t border-border pt-4">
              <h3 className="text-sm font-semibold text-foreground">Introductory Call</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Date</Label>
                  <Input type="date" value={form.intro_call_date ?? ''} onChange={(e) => set('intro_call_date', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Status</Label>
                  <select
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
                <Label>Meeting minutes</Label>
                <Textarea value={form.intro_call_meeting_minutes ?? ''} onChange={(e) => set('intro_call_meeting_minutes', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Email sent</Label>
                <Textarea value={form.intro_call_email_sent ?? ''} onChange={(e) => set('intro_call_email_sent', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>1st follow-up scheduled date</Label>
                <Input type="date" value={form.followup_1_scheduled_date ?? ''} onChange={(e) => set('followup_1_scheduled_date', e.target.value)} />
              </div>
            </section>
          )}

          {shows('followup_1') && (
            <section className="space-y-3 border-t border-border pt-4">
              <h3 className="text-sm font-semibold text-foreground">1st Follow-up</h3>
              <div className="space-y-1">
                <Label>Date</Label>
                <Input type="date" value={form.followup_1_date ?? ''} onChange={(e) => set('followup_1_date', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Notes</Label>
                <Textarea value={form.followup_1_notes ?? ''} onChange={(e) => set('followup_1_notes', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Email sent</Label>
                <Textarea value={form.followup_1_email_sent ?? ''} onChange={(e) => set('followup_1_email_sent', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>2nd follow-up scheduled date</Label>
                <Input type="date" value={form.followup_2_scheduled_date ?? ''} onChange={(e) => set('followup_2_scheduled_date', e.target.value)} />
              </div>
            </section>
          )}

          {shows('followup_2') && (
            <section className="space-y-3 border-t border-border pt-4">
              <h3 className="text-sm font-semibold text-foreground">2nd Follow-up</h3>
              <div className="space-y-1">
                <Label>Date</Label>
                <Input type="date" value={form.followup_2_date ?? ''} onChange={(e) => set('followup_2_date', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Notes</Label>
                <Textarea value={form.followup_2_notes ?? ''} onChange={(e) => set('followup_2_notes', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Email sent</Label>
                <Textarea value={form.followup_2_email_sent ?? ''} onChange={(e) => set('followup_2_email_sent', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>3rd follow-up scheduled date</Label>
                <Input type="date" value={form.followup_3_scheduled_date ?? ''} onChange={(e) => set('followup_3_scheduled_date', e.target.value)} />
              </div>
            </section>
          )}

          {shows('followup_3') && (
            <section className="space-y-3 border-t border-border pt-4">
              <h3 className="text-sm font-semibold text-foreground">3rd Follow-up</h3>
              <div className="space-y-1">
                <Label>Date</Label>
                <Input type="date" value={form.followup_3_date ?? ''} onChange={(e) => set('followup_3_date', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Notes</Label>
                <Textarea value={form.followup_3_notes ?? ''} onChange={(e) => set('followup_3_notes', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Email sent</Label>
                <Textarea value={form.followup_3_email_sent ?? ''} onChange={(e) => set('followup_3_email_sent', e.target.value)} />
              </div>
            </section>
          )}

          {shows('won') && (
            <section className="space-y-3 border-t border-border pt-4">
              <h3 className="text-sm font-semibold text-foreground">Won</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Date</Label>
                  <Input type="date" value={form.won_date ?? ''} onChange={(e) => set('won_date', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Conversion value</Label>
                  <Input
                    type="number"
                    value={form.conversion_value ?? ''}
                    onChange={(e) => set('conversion_value', e.target.value === '' ? null : Number(e.target.value))}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Notes</Label>
                <Textarea value={form.won_notes ?? ''} onChange={(e) => set('won_notes', e.target.value)} />
              </div>
            </section>
          )}

          {shows('lost') && (
            <section className="space-y-3 border-t border-border pt-4">
              <h3 className="text-sm font-semibold text-foreground">Lost</h3>
              <div className="space-y-1">
                <Label>Date</Label>
                <Input type="date" value={form.lost_date ?? ''} onChange={(e) => set('lost_date', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Notes</Label>
                <Textarea value={form.lost_notes ?? ''} onChange={(e) => set('lost_notes', e.target.value)} />
              </div>
            </section>
          )}
        </div>
        <DialogFooter>
          <Button disabled={submitting || !form.lead_date || !form.full_name} onClick={handleSave}>
            {submitting ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
