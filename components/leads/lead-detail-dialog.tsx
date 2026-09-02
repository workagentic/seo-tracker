'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { getVisibleStages } from '@/lib/leads'
import type { Lead, LeadStage } from '@/types'

type FormState = Omit<Lead, 'id' | 'created_by' | 'updated_by' | 'created_at' | 'updated_at' | 'source'>

function toFormState(lead: Lead): FormState {
  const { id: _id, created_by: _cb, updated_by: _ub, created_at: _ca, updated_at: _ua, source: _s, ...rest } = lead
  return rest
}

export function LeadDetailDialog({ lead, onClose }: { lead: Lead | null; onClose: () => void }) {
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
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
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
                <Input type="number" value={form.revenue ?? ''} onChange={(e) => set('revenue', Number(e.target.value))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Point of contact</Label>
              <Input value={form.point_of_contact ?? ''} onChange={(e) => set('point_of_contact', e.target.value)} />
            </div>
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
                  <Input type="number" value={form.conversion_value ?? ''} onChange={(e) => set('conversion_value', Number(e.target.value))} />
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
          <Button disabled={submitting} onClick={handleSave}>{submitting ? 'Saving…' : 'Save'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
