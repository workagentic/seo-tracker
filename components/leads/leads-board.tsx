'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DndContext, useDroppable, type DragEndEvent } from '@dnd-kit/core'
import { LEAD_STAGES } from '@/lib/leads'
import { LeadCard } from './lead-card'
import type { Lead, LeadStage } from '@/types'

function Column({ stage, label, leads, onCardClick }: {
  stage: LeadStage
  label: string
  leads: Lead[]
  onCardClick: (lead: Lead) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage })
  return (
    <div className="w-72 shrink-0">
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="text-xs text-muted-foreground">{leads.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={`min-h-[200px] space-y-2 rounded-md border border-dashed p-2 ${isOver ? 'border-primary bg-primary/5' : 'border-border'}`}
      >
        {leads.map((lead) => (
          <LeadCard key={lead.id} lead={lead} onClick={() => onCardClick(lead)} />
        ))}
      </div>
    </div>
  )
}

export function LeadsBoard({ leads, onOpenLead }: { leads: Lead[]; onOpenLead: (lead: Lead) => void }) {
  const [items, setItems] = useState(leads)
  const router = useRouter()

  // Keep local drag state in sync when the server data changes underneath us (filters, or a
  // refresh after the detail dialog saves).
  useEffect(() => {
    setItems(leads)
  }, [leads])

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return
    const newStage = over.id as LeadStage
    const lead = items.find((l) => l.id === active.id)
    if (!lead || lead.stage === newStage) return

    setItems((prev) => prev.map((l) => (l.id === lead.id ? { ...l, stage: newStage } : l)))
    const res = await fetch(`/api/leads/${lead.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage: newStage }),
    })
    if (!res.ok) {
      setItems((prev) => prev.map((l) => (l.id === lead.id ? { ...l, stage: lead.stage } : l)))
      return
    }
    router.refresh()
  }

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {LEAD_STAGES.map((s) => (
          <Column
            key={s.value}
            stage={s.value}
            label={s.label}
            leads={items.filter((l) => l.stage === s.value)}
            onCardClick={onOpenLead}
          />
        ))}
      </div>
    </DndContext>
  )
}
