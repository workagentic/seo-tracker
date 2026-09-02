# Leads List (Kanban) — Design Spec

**Status:** Draft, pending user review
**Solves:** New feature request — an admin-only sales lead pipeline, tracked as a Kanban
board, separate from the SEO task tracker this app otherwise covers.

---

## 1. Goal

Give the admin (Abdullah) a Kanban board of sales leads moving through a fixed 7-stage
pipeline — New Lead → Introductory Call → 1st Follow-up → 2nd Follow-up → 3rd Follow-up →
Won/Lost — with drag-and-drop stage changes, a detail view per lead, filters, and an
extensible list of lead sources managed from Settings.

This is a new subsystem with no existing pattern in the app to extend (no Kanban board, no
drag-and-drop anywhere yet) — hence a full design spec + plan rather than the lighter
in-chat-design pattern used for the task-tracker extensions elsewhere in this session.

## 2. Access control — admin only, not head

Unlike the rest of this app (where `admin` and `head` are treated equivalently for most
write access — see CLAUDE.md Section 4), Leads is scoped to **`role = 'admin'` exactly**:

- New Sidebar nav item, admin-only visibility (same conditional pattern already used for the
  existing `Admin` nav item in `components/layout/sidebar.tsx`).
- `middleware.ts` gets a `/leads` branch mirroring the existing `/admin` branch — redirects
  non-admins to `/dashboard`.
- Every `/api/leads/*` route checks `profile.role === 'admin'` exactly (not
  `['admin','head'].includes(...)`, which is the pattern used everywhere else).
- RLS on both new tables restricted to `current_role_name() = 'admin'` for all operations
  (select/insert/update/delete) — team-wide read visibility (the norm for `tasks`,
  `audit_reports`, etc.) does **not** apply here.

## 3. Data model

One wide table, matching this app's existing convention (`tasks` already has ~30 nullable
columns) rather than normalizing per-stage data into child tables — the field set per stage
is fixed, not variable.

### `leads`
```sql
create table leads (
  id uuid primary key default gen_random_uuid(),
  stage text not null default 'new_lead'
    check (stage in (
      'new_lead', 'introductory_call', 'followup_1', 'followup_2', 'followup_3',
      'won', 'lost'
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
  point_of_contact text,             -- external contact at the lead's company
  submission_from text
    check (submission_from in ('book_a_consultation', 'contact_form', 'chat')),
    -- shown/settable only when lead_sources.requires_submission_from is true for source_id

  -- Introductory Call
  intro_call_date date,
  intro_call_status text check (intro_call_status in ('conducted', 'pending')),
  intro_call_meeting_minutes text,
  intro_call_email_sent text,
  followup_1_scheduled_date date,    -- set here: when the 1st follow-up is due

  -- 1st Follow-up
  followup_1_date date,              -- this stage's own date (new, per this session's request)
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
```

Every stage's own `*_date` field (`intro_call_date`, `followup_1_date`, `followup_2_date`,
`followup_3_date`, `won_date`, `lost_date`) is distinct from the forward-scheduling
`followup_N_scheduled_date` fields — the scheduling fields answer "when is the next stage
due", set while still in the *prior* stage; the stage's own `date` answers "when did this
stage's activity happen", recorded once you're in that stage. `lead_date` (New Lead) has no
scheduling counterpart since there's no stage before it.

### `lead_sources`
```sql
create table lead_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  requires_submission_from boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz default now()
);
```
Seeded: Direct (`requires_submission_from = true`), SEO (`true`), LinkedIn (`false`), Upwork
(`false`). Admin-editable from `/admin/settings` — add a source, deactivate one (soft, matches
the `is_active` convention already used by `competitors`/`tracked_keywords`), and toggle
whether it requires Submission From. This is what makes "add more" sources in Settings work
without hardcoding source names anywhere in application logic — any newly added source can
independently opt into showing the Submission From field.

## 4. Board UI

- `app/(dashboard)/leads/page.tsx` — server component, fetches leads (+ `lead_sources` for
  filters/form dropdowns), admin guard via `getCurrentProfile()` redirect (defense-in-depth
  alongside the middleware branch).
- `components/leads/leads-board.tsx` — client component, 7 columns matching the stage enum.
  Drag-and-drop via `@dnd-kit/core` + `@dnd-kit/sortable` (new dependency — the actively
  maintained choice, unlike the deprecated `react-beautiful-dnd` which has known React 18
  issues). Dropping a card in a new column `PATCH /api/leads/[id]` with the new `stage`.
- `components/leads/lead-card.tsx` — compact card: full name, company, brand badge, and
  whichever `*_date` belongs to the current stage.
- `components/leads/lead-detail-dialog.tsx` — click a card to open; sections for every stage
  the lead has reached so far (all editable inline, matching `TaskFormDialog`'s pattern of
  direct-edit rather than a separate edit mode), later stages greyed out/hidden until reached.
- `components/leads/new-lead-dialog.tsx` — "New Lead" button, admin-only, creates with
  `stage = 'new_lead'`.
- Submission From field only rendered (in both new-lead and detail forms) when the selected
  source's `requires_submission_from` is true.

## 5. Filters

`components/leads/leads-filters.tsx`, mirroring `TaskFilters`/`AuditFilters`'s established
pattern exactly: controlled `<select>`/date inputs writing to URL search params, server
component re-queries on each param.

- Date range: `?from=&to=` filtering on `lead_date`.
- Brand: `?brand=workagentic|expertise_accelerated`.
- Source: `?source=<lead_sources.id>`.

## 6. API routes

- `app/api/leads/route.ts` — `POST` (create, admin-only).
- `app/api/leads/[id]/route.ts` — `PATCH` (update any field including `stage`, admin-only),
  `DELETE` (admin-only).
- `app/api/lead-sources/route.ts` — `POST` (create), used by the Settings page.
- `app/api/lead-sources/[id]/route.ts` — `PATCH` (toggle `is_active`/`requires_submission_from`).

All four check `profile.role === 'admin'` exactly and use the service-role admin client for
writes, same pattern as `app/api/tasks/route.ts`.

## 7. Settings integration

`/admin/settings` gets a new "Lead Sources" section/tab (the page already uses tabs per
CLAUDE.md's admin-tabs note) — a simple list with an add-source form (name +
"requires Submission From" checkbox) and a deactivate toggle per row, matching the
add/deactivate pattern already used for competitors.

## 8. Out of scope (not requested)

- No notifications tied to leads (the existing notification-bell system is task-scoped;
  extending it here isn't part of this request).
- No live-sync/Realtime wiring for leads specifically in this pass — could reuse the same
  `RealtimeRefresh` pattern later if needed, but wasn't asked for.
- No CSV import/export for leads (tasks/keywords have this; leads doesn't need it per the
  request as given).
- `employee_size` and `service_needed` are free text, not enumerated — no bucket list was
  specified.

## 9. Testing

- Unit: any pure logic worth extracting (e.g. a `getVisibleStages(lead)` helper deciding which
  stage sections are unlocked in the detail dialog) gets a Vitest test, matching this
  codebase's existing convention (`lib/tasks/permissions.test.ts`, etc.).
- Manual: create a lead, drag it through all 7 stages confirming each stage's fields persist
  and prior stages' data remains visible in the detail dialog; verify Submission From
  only appears for Direct/SEO; verify a non-admin (`head`/`owner`/`leadership`) is redirected
  away from `/leads`; add a new source in Settings and confirm it appears in the New Lead
  source dropdown immediately.
