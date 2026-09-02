import type { LeadStage } from '@/types'

export const LEAD_STAGES: { value: LeadStage; label: string }[] = [
  { value: 'new_lead', label: 'New Lead' },
  { value: 'introductory_call', label: 'Introductory Call' },
  { value: 'followup_1', label: '1st Follow-up' },
  { value: 'followup_2', label: '2nd Follow-up' },
  { value: 'followup_3', label: '3rd Follow-up' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
]

const REGULAR_STAGE_ORDER: LeadStage[] = [
  'new_lead', 'introductory_call', 'followup_1', 'followup_2', 'followup_3',
]

// Which stage sections the detail dialog should show, in pipeline order. Won/Lost can be
// reached from any regular stage and the `stage` column alone doesn't record which one a lead
// was in beforehand, so Won/Lost always shows the full regular pipeline (empty sections are
// fine -- still editable in case someone wants to backfill).
export function getVisibleStages(stage: LeadStage): LeadStage[] {
  if (stage === 'won' || stage === 'lost') {
    return [...REGULAR_STAGE_ORDER, stage]
  }
  const idx = REGULAR_STAGE_ORDER.indexOf(stage)
  return REGULAR_STAGE_ORDER.slice(0, idx + 1)
}
