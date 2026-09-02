'use client'

import { useState } from 'react'
import { LeadsBoard } from './leads-board'
import { LeadDetailDialog } from './lead-detail-dialog'
import type { Lead } from '@/types'

export function LeadsPageClient({ leads }: { leads: Lead[] }) {
  const [openLead, setOpenLead] = useState<Lead | null>(null)
  return (
    <>
      <LeadsBoard leads={leads} onOpenLead={setOpenLead} />
      <LeadDetailDialog lead={openLead} onClose={() => setOpenLead(null)} />
    </>
  )
}
