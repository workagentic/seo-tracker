'use client'

import { useState } from 'react'
import { LeadsBoard } from './leads-board'
import { LeadDetailDialog } from './lead-detail-dialog'
import type { Lead, LeadSourceWithOptions } from '@/types'

export function LeadsPageClient({ leads, sources }: { leads: Lead[]; sources: LeadSourceWithOptions[] }) {
  const [openLead, setOpenLead] = useState<Lead | null>(null)
  return (
    <>
      <LeadsBoard leads={leads} onOpenLead={setOpenLead} />
      <LeadDetailDialog lead={openLead} sources={sources} onClose={() => setOpenLead(null)} />
    </>
  )
}
