'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DndContext, KeyboardSensor, PointerSensor, useDroppable, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
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
  // Without an activation constraint, dnd-kit's PointerSensor arms a drag (and swallows the
  // subsequent click event) on every pointerdown, including a plain click with no movement --
  // which meant card clicks could never open the detail dialog. Requiring 8px of movement
  // before a drag "activates" lets a plain click through as a click. KeyboardSensor must be
  // listed explicitly too: passing an explicit `sensors` array to DndContext replaces
  // dnd-kit's defaultSensors entirely rather than merging with them, and LeadCard spreads
  // useDraggable's `{...attributes}` (tabIndex, keyboard activator wiring), so omitting it
  // here would silently break keyboard drag-and-drop.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  )

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
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
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
