# Leads List (Kanban) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an admin-only `/leads` page — a 7-column drag-and-drop Kanban board tracking
sales leads through New Lead → Introductory Call → 1st/2nd/3rd Follow-up → Won/Lost, with
filters and an admin-editable list of lead sources.

**Architecture:** One wide `leads` table (all stage fields as nullable columns, matching this
app's existing `tasks`-table convention) plus a small `lead_sources` lookup table. Server
components fetch and filter via URL search params (matching `TaskFilters`); a client
`LeadsBoard` component (new `@dnd-kit` dependency) handles drag-and-drop stage changes via
`PATCH /api/leads/[id]`. Access is admin-only end to end: middleware route guard, page-level
redirect, API role checks, and RLS — stricter than the rest of the app, which treats
`admin`/`head` equivalently.

**Tech Stack:** Next.js 14 App Router, Supabase (Postgres/RLS), TypeScript strict, Tailwind,
`@dnd-kit/core` + `@dnd-kit/utilities` (new).

**Spec:** `docs/superpowers/specs/2026-09-02-leads-kanban-design.md` — this plan implements
that spec in full; read both together.

## Global Constraints

- Node 20+, TypeScript strict mode on, pnpm only (never npm/yarn).
- Access is `role === 'admin'` **exactly** everywhere (route guard, page redirect, every API
  route, RLS) — do not use the `['admin','head'].includes(...)` pattern used elsewhere in this
  app.
- `leads`/`lead_sources` are **not** added to the `supabase_realtime` publication in this pass
  (spec Section 8, explicitly out of scope).
- No CSV import/export, no lead notifications (spec Section 8).
- `employee_size` and `service_needed` are free text, not enumerated (spec Section 8).
- Migrations start at `0022` (last existing migration is `0021_realtime_publication.sql`).

---

## Task 1: Database schema

**Files:**
- Create: `supabase/migrations/0022_leads.sql`
- Modify: `supabase/seed.sql` (append lead source seed)
- Modify: `types/index.ts` (append `LeadStage`, `Lead`, `LeadSource` types)

**Interfaces:**
- Produces: `leads` table, `lead_sources` table, and the TypeScript `Lead`/`LeadSource`/
  `LeadStage` types every later task imports from `@/types`.

- [ ] **Step 1: Write `supabase/migrations/0022_leads.sql`**

```sql
-- Leads List (Kanban) -- docs/superpowers/specs/2026-09-02-leads-kanban-design.md.
-- Admin-only (role = 'admin' exactly, not head) throughout: RLS below, plus API-level and
-- middleware-level checks in later tasks.

create table lead_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  requires_submission_from boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz default now()
);

create table leads (
  id uuid primary key default gen_random_uuid(),
  stage text not null default 'new_lead'
    check (stage in (
      'new_lead', 'introductory_call', 'followup_1', 'followup_2', 'followup_3', 'won', 'lost'
    )),

  -- New Lead
  lead_date date not null,
  full_name text not null,
  company_name text,
  email text,
  phone_number text,
  revenue numeric,
  service_needed text,
  brand text check (brand in ('workagentic', 'expertise_accelerated')),
  employee_size text,
  source_id uuid references lead_sources(id),
  point_of_contact text,
  submission_from text
    check (submission_from in ('book_a_consultation', 'contact_form', 'chat')),

  -- Introductory Call
  intro_call_date date,
  intro_call_status text check (intro_call_status in ('conducted', 'pending')),
  intro_call_meeting_minutes text,
  intro_call_email_sent text,
  followup_1_scheduled_date date,

  -- 1st Follow-up
  followup_1_date date,
  followup_1_notes text,
  followup_1_email_sent text,
  followup_2_scheduled_date date,

  -- 2nd Follow-up
  followup_2_date date,
  followup_2_notes text,
  followup_2_email_sent text,
  followup_3_scheduled_date date,

  -- 3rd Follow-up
  followup_3_date date,
  followup_3_notes text,
  followup_3_email_sent text,

  -- Won
  won_date date,
  won_notes text,
  conversion_value numeric,

  -- Lost
  lost_date date,
  lost_notes text,

  created_by uuid references profiles(id),
  updated_by uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table lead_sources enable row level security;
alter table leads enable row level security;

-- current_role_name() already exists (migration 0002_rls_policies.sql).
create policy "lead_sources_admin_only" on lead_sources for all using (
  current_role_name() = 'admin'
) with check (current_role_name() = 'admin');

create policy "leads_admin_only" on leads for all using (
  current_role_name() = 'admin'
) with check (current_role_name() = 'admin');

grant select, insert, update, delete on lead_sources to authenticated;
grant select, insert, update, delete on leads to authenticated;
grant all privileges on lead_sources to service_role;
grant all privileges on leads to service_role;
```

- [ ] **Step 2: Append seed sources to `supabase/seed.sql`**

Add at the end of the file:
```sql
insert into lead_sources (name, requires_submission_from) values
  ('Direct', true),
  ('SEO', true),
  ('LinkedIn', false),
  ('Upwork', false);
```

- [ ] **Step 3: Append types to `types/index.ts`**

```typescript
export type LeadStage =
  | 'new_lead'
  | 'introductory_call'
  | 'followup_1'
  | 'followup_2'
  | 'followup_3'
  | 'won'
  | 'lost'
export type LeadBrand = 'workagentic' | 'expertise_accelerated'
export type LeadSubmissionFrom = 'book_a_consultation' | 'contact_form' | 'chat'

export interface LeadSource {
  id: string
  name: string
  requires_submission_from: boolean
  is_active: boolean
  created_at: string
}

export interface Lead {
  id: string
  stage: LeadStage
  lead_date: string
  full_name: string
  company_name: string | null
  email: string | null
  phone_number: string | null
  revenue: number | null
  service_needed: string | null
  brand: LeadBrand | null
  employee_size: string | null
  source_id: string | null
  point_of_contact: string | null
  submission_from: LeadSubmissionFrom | null
  intro_call_date: string | null
  intro_call_status: 'conducted' | 'pending' | null
  intro_call_meeting_minutes: string | null
  intro_call_email_sent: string | null
  followup_1_scheduled_date: string | null
  followup_1_date: string | null
  followup_1_notes: string | null
  followup_1_email_sent: string | null
  followup_2_scheduled_date: string | null
  followup_2_date: string | null
  followup_2_notes: string | null
  followup_2_email_sent: string | null
  followup_3_scheduled_date: string | null
  followup_3_date: string | null
  followup_3_notes: string | null
  followup_3_email_sent: string | null
  won_date: string | null
  won_notes: string | null
  conversion_value: number | null
  lost_date: string | null
  lost_notes: string | null
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
  source?: Pick<LeadSource, 'id' | 'name' | 'requires_submission_from'> | null
}
```

- [ ] **Step 4: Verify build**

Run: `pnpm build`
Expected: succeeds (no consumers yet, this only checks the file parses).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0022_leads.sql supabase/seed.sql types/index.ts
git commit -m "feat: add leads and lead_sources schema"
```

---

## Task 2: Pure stage-visibility logic (TDD)

**Files:**
- Create: `lib/leads.ts`
- Create: `lib/leads.test.ts`

**Interfaces:**
- Consumes: `LeadStage` from `@/types` (Task 1).
- Produces: `LEAD_STAGES: {value: LeadStage, label: string}[]`, `getVisibleStages(stage:
  LeadStage): LeadStage[]`. Task 8 (detail dialog) and Task 6 (board columns) import both.

- [ ] **Step 1: Write failing test**

```typescript
import { describe, it, expect } from 'vitest'
import { getVisibleStages, LEAD_STAGES } from './leads'

describe('LEAD_STAGES', () => {
  it('has exactly the 7 pipeline stages in order', () => {
    expect(LEAD_STAGES.map((s) => s.value)).toEqual([
      'new_lead', 'introductory_call', 'followup_1', 'followup_2', 'followup_3', 'won', 'lost',
    ])
  })
})

describe('getVisibleStages', () => {
  it('shows only New Lead when a lead is brand new', () => {
    expect(getVisibleStages('new_lead')).toEqual(['new_lead'])
  })

  it('shows every stage up to and including the current one', () => {
    expect(getVisibleStages('followup_2')).toEqual([
      'new_lead', 'introductory_call', 'followup_1', 'followup_2',
    ])
  })

  it('shows all regular stages plus Won when a lead is won', () => {
    expect(getVisibleStages('won')).toEqual([
      'new_lead', 'introductory_call', 'followup_1', 'followup_2', 'followup_3', 'won',
    ])
  })

  it('shows all regular stages plus Lost when a lead is lost', () => {
    expect(getVisibleStages('lost')).toEqual([
      'new_lead', 'introductory_call', 'followup_1', 'followup_2', 'followup_3', 'lost',
    ])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test lib/leads.test.ts`
Expected: FAIL — `./leads` module not found.

- [ ] **Step 3: Write `lib/leads.ts`**

```typescript
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test lib/leads.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/leads.ts lib/leads.test.ts
git commit -m "feat: add lead stage config and visible-stages logic"
```

---

## Task 3: Leads API routes

**Files:**
- Create: `app/api/leads/route.ts`
- Create: `app/api/leads/[id]/route.ts`

**Interfaces:**
- Consumes: `getCurrentProfile` (`lib/auth.ts`), `createAdminSupabaseClient`
  (`lib/supabase/admin.ts`) — both already exist.
- Produces: `POST /api/leads` (create), `PATCH /api/leads/[id]` (update any field including
  `stage`), `DELETE /api/leads/[id]` — all admin-only. Task 6/7/8's UI calls these directly.

- [ ] **Step 1: Write `app/api/leads/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/auth'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  const profile = await getCurrentProfile()
  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  if (!body.lead_date || !body.full_name) {
    return NextResponse.json({ error: 'lead_date and full_name are required' }, { status: 400 })
  }

  const admin = createAdminSupabaseClient()
  const { data, error } = await admin
    .from('leads')
    .insert({
      stage: 'new_lead',
      lead_date: body.lead_date,
      full_name: body.full_name,
      company_name: body.company_name || null,
      email: body.email || null,
      phone_number: body.phone_number || null,
      revenue: body.revenue || null,
      service_needed: body.service_needed || null,
      brand: body.brand || null,
      employee_size: body.employee_size || null,
      source_id: body.source_id || null,
      point_of_contact: body.point_of_contact || null,
      submission_from: body.submission_from || null,
      created_by: profile.id,
      updated_by: profile.id,
    } as never)
    .select('*, source:source_id(id, name, requires_submission_from)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ lead: data })
}
```

- [ ] **Step 2: Write `app/api/leads/[id]/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/auth'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'

const EDITABLE_FIELDS = [
  'stage', 'lead_date', 'full_name', 'company_name', 'email', 'phone_number', 'revenue',
  'service_needed', 'brand', 'employee_size', 'source_id', 'point_of_contact',
  'submission_from', 'intro_call_date', 'intro_call_status', 'intro_call_meeting_minutes',
  'intro_call_email_sent', 'followup_1_scheduled_date', 'followup_1_date', 'followup_1_notes',
  'followup_1_email_sent', 'followup_2_scheduled_date', 'followup_2_date', 'followup_2_notes',
  'followup_2_email_sent', 'followup_3_scheduled_date', 'followup_3_date', 'followup_3_notes',
  'followup_3_email_sent', 'won_date', 'won_notes', 'conversion_value', 'lost_date',
  'lost_notes',
] as const

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const profile = await getCurrentProfile()
  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const update: Record<string, unknown> = { updated_by: profile.id, updated_at: new Date().toISOString() }
  for (const field of EDITABLE_FIELDS) {
    if (field in body) update[field] = body[field]
  }

  const admin = createAdminSupabaseClient()
  const { data, error } = await admin
    .from('leads')
    .update(update as never)
    .eq('id', id)
    .select('*, source:source_id(id, name, requires_submission_from)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ lead: data })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const profile = await getCurrentProfile()
  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const admin = createAdminSupabaseClient()
  const { error } = await admin.from('leads').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 3: Verify build**

Run: `pnpm build`
Expected: succeeds.

- [ ] **Step 4: Commit**

```bash
git add app/api/leads
git commit -m "feat: add leads CRUD API routes"
```

---

## Task 4: Lead sources API routes

**Files:**
- Create: `app/api/lead-sources/route.ts`
- Create: `app/api/lead-sources/[id]/route.ts`

**Interfaces:**
- Produces: `POST /api/lead-sources` (create), `PATCH /api/lead-sources/[id]` (toggle
  `is_active`/`requires_submission_from`) — both admin-only. Task 10's Settings UI calls these.

- [ ] **Step 1: Write `app/api/lead-sources/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/auth'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  const profile = await getCurrentProfile()
  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  if (!body.name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }

  const admin = createAdminSupabaseClient()
  const { data, error } = await admin
    .from('lead_sources')
    .insert({ name: body.name, requires_submission_from: !!body.requires_submission_from } as never)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ source: data })
}
```

- [ ] **Step 2: Write `app/api/lead-sources/[id]/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/auth'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const profile = await getCurrentProfile()
  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const update: Record<string, unknown> = {}
  if (typeof body.is_active === 'boolean') update.is_active = body.is_active
  if (typeof body.requires_submission_from === 'boolean') update.requires_submission_from = body.requires_submission_from

  const admin = createAdminSupabaseClient()
  const { error } = await admin.from('lead_sources').update(update as never).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 3: Verify build**

Run: `pnpm build`
Expected: succeeds.

- [ ] **Step 4: Commit**

```bash
git add app/api/lead-sources
git commit -m "feat: add lead sources CRUD API routes"
```

---

## Task 5: Access control — middleware, sidebar nav

**Files:**
- Modify: `middleware.ts`
- Modify: `components/layout/sidebar.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: `/leads` redirects non-admins to `/dashboard`; sidebar shows a "Leads" link only
  for `role === 'admin'`.

- [ ] **Step 1: Add the `/leads` guard to `middleware.ts`**

In `middleware.ts`, right after the existing `if (user && request.nextUrl.pathname.startsWith('/admin'))` block, add:

```typescript
  if (user && request.nextUrl.pathname.startsWith('/leads')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    if (profile?.role !== 'admin') {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }
```

- [ ] **Step 2: Add the nav item in `components/layout/sidebar.tsx`**

In the `NAV_ITEMS` array, add a new entry right before the existing `Admin` entry:
```typescript
  { href: '/leads', label: 'Leads', roles: ['admin'] },
```

- [ ] **Step 3: Verify build**

Run: `pnpm build`
Expected: succeeds (the `/leads` route doesn't exist yet — the sidebar `Link` and middleware
branch don't require the route to exist to compile).

- [ ] **Step 4: Commit**

```bash
git add middleware.ts components/layout/sidebar.tsx
git commit -m "feat: gate /leads to admin-only, add sidebar nav item"
```

---

## Task 6: Install @dnd-kit, build the Kanban board

**Files:**
- Modify: `package.json` (new dependency)
- Create: `components/leads/lead-card.tsx`
- Create: `components/leads/leads-board.tsx`
- Create: `app/(dashboard)/leads/page.tsx`

**Interfaces:**
- Consumes: `LEAD_STAGES` (`lib/leads.ts`, Task 2), `Lead`/`LeadSource` (`@/types`, Task 1),
  `PATCH /api/leads/[id]` (Task 3).
- Produces: a working board that renders leads into columns and moves them on drop. No
  create/edit dialogs yet (Tasks 7–8) — clicking a card does nothing until Task 8.

- [ ] **Step 1: Install dependencies**

```bash
pnpm add @dnd-kit/core @dnd-kit/utilities
```

- [ ] **Step 2: Write `components/leads/lead-card.tsx`**

```tsx
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
```

- [ ] **Step 3: Write `components/leads/leads-board.tsx`**

```tsx
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
```

- [ ] **Step 4: Write `app/(dashboard)/leads/page.tsx`**

```tsx
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/auth'
import { LeadsBoard } from '@/components/leads/leads-board'
import type { Lead } from '@/types'

export default async function LeadsPage() {
  const profile = await getCurrentProfile()
  if (!profile || profile.role !== 'admin') redirect('/dashboard')

  const supabase = await createServerSupabaseClient()
  const { data: leads } = await supabase
    .from('leads')
    .select('*, source:source_id(id, name, requires_submission_from)')
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Leads</h1>
      </div>
      <LeadsBoard leads={(leads as Lead[]) ?? []} onOpenLead={() => {}} />
    </div>
  )
}
```

(`onOpenLead={() => {}}` is a temporary no-op — Task 8 wires this up to the detail dialog. This
keeps the board independently testable now rather than bundling it with Task 8's dialog.)

- [ ] **Step 5: Verify build**

Run: `pnpm build`
Expected: succeeds.

- [ ] **Step 6: Manual check**

Run: `pnpm dev`, sign in as the admin user, visit `/leads`. Expected: 7 empty columns, no
errors. Sign in as a non-admin user, visit `/leads` — expected: redirected to `/dashboard`.

- [ ] **Step 7: Commit**

```bash
git add package.json pnpm-lock.yaml components/leads app/\(dashboard\)/leads
git commit -m "feat: add Leads Kanban board with drag-and-drop stage changes"
```

---

## Task 7: New Lead dialog

**Files:**
- Create: `components/leads/new-lead-dialog.tsx`
- Modify: `app/(dashboard)/leads/page.tsx`

**Interfaces:**
- Consumes: `POST /api/leads` (Task 3), `LeadSource` (`@/types`).
- Produces: a "New Lead" button (admin-only page, so no extra role check needed inside the
  component) that creates a lead with `stage = 'new_lead'`.

- [ ] **Step 1: Write `components/leads/new-lead-dialog.tsx`**

```tsx
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
                onChange={(e) => set('source_id', e.target.value)}
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
```

- [ ] **Step 2: Wire it into `app/(dashboard)/leads/page.tsx`**

Add the source fetch and render the dialog:
```typescript
import { NewLeadDialog } from '@/components/leads/new-lead-dialog'
import type { Lead, LeadSource } from '@/types'
```
(extend the existing `import type { Lead } from '@/types'` to include `LeadSource`)

```typescript
  const { data: sources } = await supabase.from('lead_sources').select('*').order('name')
```
(add right after the existing `leads` query)

```tsx
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Leads</h1>
        <NewLeadDialog sources={(sources as LeadSource[]) ?? []} />
      </div>
```
(replace the existing header `div` block)

- [ ] **Step 3: Verify build**

Run: `pnpm build`
Expected: succeeds.

- [ ] **Step 4: Manual check**

Run: `pnpm dev`, visit `/leads` as admin, click "New Lead", pick a source with
`requires_submission_from` (e.g. Direct — seeded in Task 1), confirm the Submission From field
appears; pick LinkedIn, confirm it disappears. Create a lead, confirm it shows up in the New
Lead column.

- [ ] **Step 5: Commit**

```bash
git add components/leads/new-lead-dialog.tsx app/\(dashboard\)/leads/page.tsx
git commit -m "feat: add New Lead creation dialog"
```

---

## Task 8: Lead detail dialog

**Files:**
- Create: `components/leads/lead-detail-dialog.tsx`
- Modify: `app/(dashboard)/leads/page.tsx`

**Interfaces:**
- Consumes: `getVisibleStages` (`lib/leads.ts`, Task 2), `PATCH /api/leads/[id]` (Task 3).
- Produces: clicking a card opens this dialog; wires up `LeadsBoard`'s `onOpenLead` (previously
  a no-op from Task 6).

- [ ] **Step 1: Write `components/leads/lead-detail-dialog.tsx`**

```tsx
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
```

- [ ] **Step 2: Wire it into `app/(dashboard)/leads/page.tsx`**

The page is a server component and `onOpenLead` needs client-side state (which lead is open),
so this needs a small client wrapper. Create `components/leads/leads-page-client.tsx`:

```tsx
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
```

Then in `app/(dashboard)/leads/page.tsx`, replace:
```tsx
      <LeadsBoard leads={(leads as Lead[]) ?? []} onOpenLead={() => {}} />
```
with:
```tsx
      <LeadsPageClient leads={(leads as Lead[]) ?? []} />
```
and swap the `LeadsBoard` import for:
```typescript
import { LeadsPageClient } from '@/components/leads/leads-page-client'
```

- [ ] **Step 3: Verify build**

Run: `pnpm build`
Expected: succeeds.

- [ ] **Step 4: Manual check**

Run: `pnpm dev`, click a lead card, confirm the detail dialog opens showing only the New Lead
section for a brand-new lead. Drag it to "Introductory Call", reopen — confirm the
Introductory Call section now appears. Fill in fields, Save, reopen — confirm they persisted.

- [ ] **Step 5: Commit**

```bash
git add components/leads/lead-detail-dialog.tsx components/leads/leads-page-client.tsx "app/(dashboard)/leads/page.tsx"
git commit -m "feat: add lead detail dialog with per-stage sections"
```

---

## Task 9: Filters

**Files:**
- Create: `components/leads/leads-filters.tsx`
- Modify: `app/(dashboard)/leads/page.tsx`

**Interfaces:**
- Consumes: `LeadSource`, `LeadBrand` (`@/types`).
- Produces: `?from=&to=&brand=&source=` URL params filtering the server-fetched `leads` query.

- [ ] **Step 1: Write `components/leads/leads-filters.tsx`**

```tsx
'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import type { LeadSource } from '@/types'

export function LeadsFilters({ sources }: { sources: LeadSource[] }) {
  const router = useRouter()
  const params = useSearchParams()

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString())
    if (value) next.set(key, value)
    else next.delete(key)
    router.push(`/leads?${next.toString()}`)
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <label className="text-xs text-muted-foreground">From</label>
      <input
        type="date"
        defaultValue={params.get('from') ?? ''}
        onChange={(e) => setParam('from', e.target.value)}
        className="rounded border border-input bg-card px-2 py-1 text-sm text-foreground"
      />
      <label className="text-xs text-muted-foreground">To</label>
      <input
        type="date"
        defaultValue={params.get('to') ?? ''}
        onChange={(e) => setParam('to', e.target.value)}
        className="rounded border border-input bg-card px-2 py-1 text-sm text-foreground"
      />
      <select
        className="rounded border border-input bg-card px-2 py-1 text-sm text-foreground"
        defaultValue={params.get('brand') ?? ''}
        onChange={(e) => setParam('brand', e.target.value)}
      >
        <option value="">All brands</option>
        <option value="workagentic">WorkAgentic</option>
        <option value="expertise_accelerated">Expertise Accelerated</option>
      </select>
      <select
        className="rounded border border-input bg-card px-2 py-1 text-sm text-foreground"
        defaultValue={params.get('source') ?? ''}
        onChange={(e) => setParam('source', e.target.value)}
      >
        <option value="">All sources</option>
        {sources.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
    </div>
  )
}
```

- [ ] **Step 2: Wire filters into `app/(dashboard)/leads/page.tsx`**

Replace the whole file with:
```tsx
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/auth'
import { NewLeadDialog } from '@/components/leads/new-lead-dialog'
import { LeadsFilters } from '@/components/leads/leads-filters'
import { LeadsPageClient } from '@/components/leads/leads-page-client'
import type { Lead, LeadSource } from '@/types'

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const profile = await getCurrentProfile()
  if (!profile || profile.role !== 'admin') redirect('/dashboard')

  const params = await searchParams
  const supabase = await createServerSupabaseClient()

  let query = supabase
    .from('leads')
    .select('*, source:source_id(id, name, requires_submission_from)')
    .order('created_at', { ascending: false })

  if (params.from) query = query.gte('lead_date', params.from)
  if (params.to) query = query.lte('lead_date', params.to)
  if (params.brand) query = query.eq('brand', params.brand)
  if (params.source) query = query.eq('source_id', params.source)

  const { data: leads } = await query
  const { data: sources } = await supabase.from('lead_sources').select('*').order('name')

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Leads</h1>
        <NewLeadDialog sources={(sources as LeadSource[]) ?? []} />
      </div>
      <LeadsFilters sources={(sources as LeadSource[]) ?? []} />
      <LeadsPageClient leads={(leads as Lead[]) ?? []} />
    </div>
  )
}
```

- [ ] **Step 3: Verify build**

Run: `pnpm build`
Expected: succeeds.

- [ ] **Step 4: Manual check**

Run: `pnpm dev`, create leads with different brands/sources/dates, confirm each filter narrows
the board correctly and combinations work (e.g. brand + source together).

- [ ] **Step 5: Commit**

```bash
git add components/leads/leads-filters.tsx "app/(dashboard)/leads/page.tsx"
git commit -m "feat: add date range, brand, and source filters to Leads board"
```

---

## Task 10: Admin Lead Sources management

**Files:**
- Create: `app/(dashboard)/admin/lead-sources/page.tsx`
- Create: `components/admin/lead-source-form.tsx`
- Create: `components/admin/lead-source-toggle.tsx`
- Modify: `components/admin/admin-tabs.tsx`

**Interfaces:**
- Consumes: `POST /api/lead-sources`, `PATCH /api/lead-sources/[id]` (Task 4).
- Produces: a new "Lead Sources" tab under `/admin`, matching the existing `/admin/users`
  list+add pattern.

- [ ] **Step 1: Write `components/admin/lead-source-form.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function LeadSourceForm() {
  const [name, setName] = useState('')
  const [requiresSubmissionFrom, setRequiresSubmissionFrom] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()

  async function handleSubmit() {
    setSubmitting(true)
    try {
      const res = await fetch('/api/lead-sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, requires_submission_from: requiresSubmissionFrom }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        alert(body.error ?? 'Failed to add source')
        return
      }
      setName('')
      setRequiresSubmissionFrom(false)
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-md space-y-3 rounded-md border border-border bg-card p-4">
      <h2 className="font-medium text-foreground">Add lead source</h2>
      <Input placeholder="Source name" value={name} onChange={(e) => setName(e.target.value)} />
      <label className="flex items-center gap-2 text-sm text-foreground">
        <input type="checkbox" checked={requiresSubmissionFrom} onChange={(e) => setRequiresSubmissionFrom(e.target.checked)} />
        Requires &quot;Submission from&quot; on new leads
      </label>
      <Button disabled={submitting || !name} onClick={handleSubmit}>
        {submitting ? 'Adding…' : 'Add source'}
      </Button>
    </div>
  )
}
```

- [ ] **Step 2: Write `components/admin/lead-source-toggle.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function LeadSourceToggle({ id, field, value }: { id: string; field: 'is_active' | 'requires_submission_from'; value: boolean }) {
  const [busy, setBusy] = useState(false)
  const router = useRouter()

  async function toggle() {
    setBusy(true)
    try {
      await fetch(`/api/lead-sources/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: !value }),
      })
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <input type="checkbox" checked={value} disabled={busy} onChange={toggle} />
  )
}
```

- [ ] **Step 3: Write `app/(dashboard)/admin/lead-sources/page.tsx`**

```tsx
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { LeadSourceForm } from '@/components/admin/lead-source-form'
import { LeadSourceToggle } from '@/components/admin/lead-source-toggle'
import type { LeadSource } from '@/types'

export default async function AdminLeadSourcesPage() {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase.from('lead_sources').select('*').order('name')

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-foreground">Lead Sources</h1>
      <LeadSourceForm />
      <div className="overflow-x-auto rounded-md border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs font-medium uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Requires Submission From</th>
              <th className="px-4 py-2">Active</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {((data as LeadSource[]) ?? []).map((s) => (
              <tr key={s.id} className="hover:bg-muted/50">
                <td className="px-4 py-2 text-foreground">{s.name}</td>
                <td className="px-4 py-2">
                  <LeadSourceToggle id={s.id} field="requires_submission_from" value={s.requires_submission_from} />
                </td>
                <td className="px-4 py-2">
                  <LeadSourceToggle id={s.id} field="is_active" value={s.is_active} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Add the tab in `components/admin/admin-tabs.tsx`**

In `ADMIN_TABS`, add:
```typescript
  { href: '/admin/lead-sources', label: 'Lead Sources' },
```

- [ ] **Step 5: Verify build**

Run: `pnpm build`
Expected: succeeds.

- [ ] **Step 6: Manual check**

Run: `pnpm dev`, visit `/admin/lead-sources`, add a new source with "Requires Submission from"
checked, confirm it appears in the New Lead dialog's source dropdown and the Submission From
field shows when it's selected. Toggle a source's Active off, confirm it drops out of the New
Lead dropdown (still visible in this admin list, since deactivating is soft).

- [ ] **Step 7: Commit**

```bash
git add "app/(dashboard)/admin/lead-sources" components/admin/lead-source-form.tsx components/admin/lead-source-toggle.tsx components/admin/admin-tabs.tsx
git commit -m "feat: add admin Lead Sources management tab"
```

---

## Task 11: Documentation and final verification

**Files:**
- Modify: `CLAUDE.md`

**Interfaces:**
- Produces: nothing consumed by other tasks — this is the last task.

- [ ] **Step 1: Add a schema section to CLAUDE.md**

After the last existing `### 5.1N` table section, add:
```markdown
### 5.17 `lead_sources` / `leads`
Added `0022_leads.sql`. Admin-only (`role = 'admin'` exactly, not `head`) throughout — RLS,
API routes, and a `middleware.ts` route guard on `/leads`, unlike the rest of this app where
`admin`/`head` are treated equivalently. See Section 8.10 and
`docs/superpowers/specs/2026-09-02-leads-kanban-design.md`.
```

- [ ] **Step 2: Add a feature section to CLAUDE.md**

After the last existing `### 8.9` (or whichever is the last numbered feature section), add:
```markdown
### 8.10 Leads (`/leads`) — admin only
A 7-column Kanban board (New Lead → Introductory Call → 1st/2nd/3rd Follow-up → Won/Lost) for
the sales pipeline, unrelated to the SEO task tracker. True drag-and-drop via `@dnd-kit`
(`components/leads/leads-board.tsx`) — dragging a card just changes `stage`; all other
per-stage fields are edited via `LeadDetailDialog`, which shows sections for every stage up to
and including the lead's current one (`lib/leads.ts`'s `getVisibleStages`, unit-tested).
Lead sources are admin-editable from `/admin/lead-sources` — each source has a
`requires_submission_from` flag (not a hardcoded "Direct or SEO" check) driving whether the
Submission From field shows on a lead. Filters: date range (on `lead_date`), Brand, Source, as
URL params, matching `TaskFilters`. Out of scope for this pass: no notifications, no
Realtime/live-sync wiring, no CSV import/export (spec Section 8).
```

- [ ] **Step 3: Add a changelog entry to CLAUDE.md's Section 14**

```markdown
- **2 Sep 2026:** Leads List (Kanban) — new admin-only feature, unrelated to the SEO task
  tracker. See Section 8.10 and `docs/superpowers/specs/2026-09-02-leads-kanban-design.md`.
```

- [ ] **Step 4: Full verification**

Run: `pnpm build`
Expected: succeeds, all routes including `/leads` and `/admin/lead-sources` listed.

Run: `pnpm test`
Expected: all tests pass, including the 5 new `lib/leads.test.ts` tests from Task 2.

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: document Leads Kanban feature in CLAUDE.md"
```
