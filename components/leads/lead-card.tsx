'use client'

import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import type { Lead } from '@/types'

const BRAND_LABELS: Record<string, string> = {
  workagentic: 'WorkAgentic',
  expertise_accelerated: 'Expertise Accelerated',
}

function currentStageDate(lead: Lead): string | null {
  switch (lead.stage) {
    case 'new_lead': return lead.lead_date
    case 'introductory_call': return lead.intro_call_date
    case 'followup_1': return lead.followup_1_date
    case 'followup_2': return lead.followup_2_date
    case 'followup_3': return lead.followup_3_date
    case 'won': return lead.won_date
    case 'lost': return lead.lost_date
    default: return null
  }
}

export function LeadCard({ lead, onClick }: { lead: Lead; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: lead.id })
  const date = currentStageDate(lead)

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={onClick}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={`cursor-grab space-y-1 rounded-md border border-border bg-card p-3 text-sm shadow-sm active:cursor-grabbing ${isDragging ? 'opacity-50' : ''}`}
    >
      <div className="font-medium text-foreground">{lead.full_name}</div>
      {lead.company_name && <div className="text-xs text-muted-foreground">{lead.company_name}</div>}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{date ?? '—'}</span>
        {lead.brand && <span className="rounded-full bg-muted px-2 py-0.5">{BRAND_LABELS[lead.brand]}</span>}
      </div>
    </div>
  )
}
