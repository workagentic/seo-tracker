# EA SEO Tracker v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the v1 slice of the EA SEO Tracker — a Next.js 14 + Supabase internal dashboard where 9 named team members log in, see 12 KPI stat tiles vs. quarterly targets, manage the 34-action task register, view the Q1 scorecard, manage competitors/keywords/audit findings, and where the admin (Abdullah) can add users and manually sync/enter metrics.

**Architecture:** Next.js 14 App Router (TypeScript, strict) with Supabase (Postgres + Auth + RLS) as the only backend. Server Components read data directly via the Supabase server client; mutations go through Route Handlers under `app/api/*` that use the service-role client after checking the caller's role. Client-side interactivity (task status changes, filters) uses TanStack Query talking to those route handlers. Ahrefs sync is a real route handler with a **stubbed** HTTP client (returns realistic fixture data) so the sync pipeline, storage, and UI are fully wired and only the live fetch needs a real `AHREFS_API_KEY` later. No charts/sparklines, no GA4/Clarity, no weekly email — those are v2 per CLAUDE.md Section 13.

**Tech Stack:** Next.js 14 (App Router, TS strict), Supabase (Postgres/Auth/RLS), Tailwind CSS + shadcn/ui, TanStack Query, Vitest (unit tests for pure logic), pnpm, Node 20+.

**Spec:** `CLAUDE.md` (project root) — this plan implements Sections 2–7, 8.1–8.4 core paths, 8.5–8.7, 8.9, 9, 10, per the v1 Definition of Done in Section 13. Sections 8.2's charts/sparklines, 8.8 (weekly report), GA4 (7.3), and Clarity (7.4) are explicitly out of scope for v1.

## Global Constraints

- Node 20+, TypeScript strict mode on (from CLAUDE.md Section 2).
- Package manager is pnpm (Section 2) — never use npm/yarn commands.
- Every route must be behind Supabase auth via `middleware.ts`; there are no public pages (Section 12.7).
- RLS is enabled on every table; `owner` role can only `UPDATE` `tasks` rows where `assigned_to = auth.uid()`, but all roles can `SELECT` all tasks (Section 4).
- `metric_snapshots` rows are append-only — never update or delete a historical row (Section 12.9).
- Only one `profiles` row may have `role = 'admin'` at a time (Section 12.10).
- `referring_domains_quality` on `metric_snapshots` is manual-entry only; the Ahrefs sync route must never write to that column (Section 12.3).
- Desktop-first (1280px+); it must not visually break at tablet widths, but phone optimization is not required (Section 12.8).
- Use `uuid` primary keys throughout, per Section 5.
- RAG thresholds: green ≥95% of target, amber 80–94%, red <80% (Section 9.1) — implement exactly the `calculateRAG` function given in the spec.

---

## Task 1: Project scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.mjs`, `tailwind.config.ts`, `postcss.config.js`, `.eslintrc.json`, `.gitignore`
- Create: `app/layout.tsx`, `app/globals.css`
- Create: `.env.local.example`
- Create: `README.md`

**Interfaces:**
- Produces: a runnable `pnpm dev` Next.js 14 App Router project with Tailwind + shadcn/ui initialized, TypeScript strict mode, and path alias `@/*` → project root. All later tasks assume this exists.

- [ ] **Step 1: Scaffold Next.js app**

Run:
```bash
pnpm dlx create-next-app@14 . --typescript --tailwind --eslint --app --src-dir=false --import-alias "@/*" --use-pnpm
```
Answer "No" to any prompt about overwriting `CLAUDE.md`/`docs`/the `.docx` file if asked (keep existing files).

- [ ] **Step 2: Confirm strict mode**

Open `tsconfig.json` and ensure `"strict": true` is set under `compilerOptions` (create-next-app sets this by default — verify, don't duplicate).

- [ ] **Step 3: Init shadcn/ui**

Run:
```bash
pnpm dlx shadcn@latest init -d
```
This creates `components.json` and `lib/utils.ts` (the `cn()` helper).

- [ ] **Step 4: Install remaining dependencies**

Run:
```bash
pnpm add @supabase/supabase-js @supabase/ssr @tanstack/react-query @tanstack/react-query-devtools zod papaparse date-fns
pnpm add -D vitest @vitejs/plugin-react @types/papaparse
```

- [ ] **Step 5: Add shadcn/ui base components used across the app**

Run:
```bash
pnpm dlx shadcn@latest add button card table badge dialog dropdown-menu input label select tabs textarea toast sheet avatar separator
```

- [ ] **Step 6: Write `.env.local.example`**

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Ahrefs
AHREFS_API_KEY=

# Google (v2 — placeholders only, unused in v1)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REFRESH_TOKEN=
GA4_PROPERTY_ID=
GSC_SITE_URL=

# Microsoft Clarity (v2 — placeholders only, unused in v1)
CLARITY_PROJECT_ID=
CLARITY_API_TOKEN=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

- [ ] **Step 7: Add Vitest config**

Create `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, '.') } },
  test: { environment: 'node' },
})
```

Add to `package.json` scripts: `"test": "vitest run"`.

- [ ] **Step 8: Verify dev server boots**

Run: `pnpm dev` (kill it after confirming `http://localhost:3000` returns the default Next.js page), then `pnpm build` to confirm a clean TypeScript build.
Expected: both succeed with no TS errors.

- [ ] **Step 9: Commit**

```bash
git init
git add -A
git commit -m "chore: scaffold Next.js 14 + TS + Tailwind + shadcn/ui project"
```

---

## Task 2: TypeScript domain types

**Files:**
- Create: `types/index.ts`

**Interfaces:**
- Produces: every type used across the app — `Role`, `Profile`, `TaskStatus`, `Task`, `MetricSnapshot`, `Competitor`, `TrackedKeyword`, `KeywordHistoryEntry`, `AuditReport`, `AuditSeverity`, `AuditCategory`, `AuditStatus`, `RAGStatus`, `QuarterLabel`, `QuarterTarget`. All later tasks import from here — do not redefine these shapes elsewhere.

- [ ] **Step 1: Write `types/index.ts`**

```typescript
export type Role = 'admin' | 'head' | 'owner' | 'leadership'

export interface Profile {
  id: string
  full_name: string
  role: Role
  job_title: string | null
  section_owner: string | null
  avatar_url: string | null
  created_at: string
  is_active: boolean
}

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'blocked' | 'overdue'
export type QuarterLabel = 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'Q5'

export interface Task {
  id: string
  action_number: string
  title: string
  description: string | null
  position_responsible: string | null
  assigned_to: string | null
  co_assigned_to: string | null
  due_date: string | null
  status: TaskStatus
  quarter: QuarterLabel | 'All' | null
  notes: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
  assigned_profile?: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null
  co_assigned_profile?: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null
}

export type MetricKey =
  | 'domain_rating'
  | 'organic_traffic_global'
  | 'organic_traffic_us'
  | 'organic_keywords_global'
  | 'organic_keywords_us'
  | 'keywords_top_3'
  | 'keywords_top_10'
  | 'traffic_value_monthly'
  | 'referring_domains_total'
  | 'referring_domains_quality'
  | 'avg_keywords_per_page'
  | 'indexed_content_pages'

export type MetricSnapshot = {
  id: string
  snapshot_date: string
  quarter_label: string | null
  notes: string | null
  created_by: string | null
  created_at: string
} & Record<MetricKey, number | null>

export interface Competitor {
  id: string
  company_name: string
  domain: string
  domain_rating: number | null
  organic_traffic: number | null
  organic_keywords: number | null
  keywords_top_3: number | null
  est_traffic_value: number | null
  referring_domains: number | null
  last_synced_at: string | null
  is_active: boolean
  created_at: string
}

export type KeywordCategory = 'striking-distance' | 'commercial' | 'glossary' | 'niche'
export type KeywordPriority = 'high' | 'medium' | 'low'

export interface TrackedKeyword {
  id: string
  keyword: string
  priority: KeywordPriority | null
  category: KeywordCategory | null
  target_url: string | null
  monthly_volume: number | null
  keyword_difficulty: number | null
  cpc: number | null
  current_position: number | null
  previous_position: number | null
  position_updated_at: string | null
  notes: string | null
  is_active: boolean
  created_at: string
}

export interface KeywordHistoryEntry {
  id: string
  keyword_id: string
  recorded_at: string
  position: number | null
  url: string | null
}

export type AuditCategory = 'technical' | 'backlink' | 'content' | 'on-page' | 'architecture'
export type AuditSeverity = 'critical' | 'high' | 'medium' | 'low'
export type AuditStatus = 'open' | 'in_progress' | 'resolved' | 'wont_fix'

export interface AuditReport {
  id: string
  title: string
  category: AuditCategory | null
  severity: AuditSeverity | null
  finding: string
  recommendation: string | null
  assigned_to: string | null
  status: AuditStatus
  resolved_at: string | null
  created_at: string
  assigned_profile?: Pick<Profile, 'id' | 'full_name'> | null
}

export type RAGStatus = 'green' | 'amber' | 'red' | 'no-data'

export interface QuarterTarget {
  label: string
  date: string
  domain_rating: number
  organic_traffic_global: number
  organic_traffic_us: number
  organic_keywords_global: number
  organic_keywords_us: number
  keywords_top_3: number
  keywords_top_10: number
  traffic_value_monthly: number
  referring_domains_total: number
  referring_domains_quality: number
  avg_keywords_per_page: number
  indexed_content_pages: number
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: succeeds (no consumers yet, so this only checks the file itself parses).

- [ ] **Step 3: Commit**

```bash
git add types/index.ts
git commit -m "feat: add shared domain types"
```

---

## Task 3: Database migrations (schema + RLS)

**Files:**
- Create: `supabase/migrations/0001_initial_schema.sql`
- Create: `supabase/migrations/0002_rls_policies.sql`

**Interfaces:**
- Produces: all 8 tables from CLAUDE.md Section 5 (`profiles`, `tasks`, `metric_snapshots`, `competitors`, `tracked_keywords`, `keyword_history`, `audit_reports`, `weekly_reports`) plus RLS policies. Later tasks (seed data, API routes) assume these exact table/column names.

- [ ] **Step 1: Write `0001_initial_schema.sql`**

```sql
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('admin', 'head', 'owner', 'leadership')),
  job_title text,
  section_owner text,
  avatar_url text,
  is_active boolean not null default true,
  created_at timestamptz default now()
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  action_number text not null,
  title text not null,
  description text,
  position_responsible text,
  assigned_to uuid references profiles(id),
  co_assigned_to uuid references profiles(id),
  due_date date,
  status text not null default 'pending'
    check (status in ('pending', 'in_progress', 'completed', 'blocked', 'overdue')),
  quarter text,
  notes text,
  completed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table metric_snapshots (
  id uuid primary key default gen_random_uuid(),
  snapshot_date date not null,
  quarter_label text,
  domain_rating integer,
  organic_traffic_global integer,
  organic_traffic_us integer,
  organic_keywords_global integer,
  organic_keywords_us integer,
  keywords_top_3 integer,
  keywords_top_10 integer,
  traffic_value_monthly numeric,
  referring_domains_total integer,
  referring_domains_quality integer,
  avg_keywords_per_page numeric,
  indexed_content_pages integer,
  notes text,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

create table competitors (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  domain text not null unique,
  domain_rating integer,
  organic_traffic integer,
  organic_keywords integer,
  keywords_top_3 integer,
  est_traffic_value numeric,
  referring_domains integer,
  last_synced_at timestamptz,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table tracked_keywords (
  id uuid primary key default gen_random_uuid(),
  keyword text not null,
  priority text check (priority in ('high', 'medium', 'low')),
  category text,
  target_url text,
  monthly_volume integer,
  keyword_difficulty integer,
  cpc numeric,
  current_position integer,
  previous_position integer,
  position_updated_at timestamptz,
  notes text,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table keyword_history (
  id uuid primary key default gen_random_uuid(),
  keyword_id uuid references tracked_keywords(id) on delete cascade,
  recorded_at date not null,
  position integer,
  url text
);

create table audit_reports (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text,
  severity text check (severity in ('critical', 'high', 'medium', 'low')),
  finding text not null,
  recommendation text,
  assigned_to uuid references profiles(id),
  status text default 'open'
    check (status in ('open', 'in_progress', 'resolved', 'wont_fix')),
  resolved_at timestamptz,
  created_at timestamptz default now()
);

create table weekly_reports (
  id uuid primary key default gen_random_uuid(),
  week_start date not null,
  week_end date not null,
  generated_at timestamptz default now(),
  summary jsonb,
  recipient_ids uuid[]
);
```

- [ ] **Step 2: Write `0002_rls_policies.sql`**

```sql
alter table profiles enable row level security;
alter table tasks enable row level security;
alter table metric_snapshots enable row level security;
alter table competitors enable row level security;
alter table tracked_keywords enable row level security;
alter table keyword_history enable row level security;
alter table audit_reports enable row level security;
alter table weekly_reports enable row level security;

create or replace function current_role_name() returns text as $$
  select role from profiles where id = auth.uid();
$$ language sql stable security definer;

-- profiles: everyone authenticated can read all profiles (needed for owner names/avatars)
create policy "profiles_select_all" on profiles for select using (auth.role() = 'authenticated');
create policy "profiles_update_admin" on profiles for update using (current_role_name() = 'admin');
create policy "profiles_insert_admin" on profiles for insert with check (current_role_name() = 'admin');

-- tasks: all authenticated roles can read all tasks
create policy "tasks_select_all" on tasks for select using (auth.role() = 'authenticated');
-- owner can update only their own (assigned or co-assigned) tasks
create policy "tasks_update_owner" on tasks for update using (
  current_role_name() = 'owner' and (assigned_to = auth.uid() or co_assigned_to = auth.uid())
);
-- admin/head can update any task
create policy "tasks_update_admin_head" on tasks for update using (
  current_role_name() in ('admin', 'head')
);
create policy "tasks_insert_admin_head" on tasks for insert with check (
  current_role_name() in ('admin', 'head')
);

-- metric_snapshots: all authenticated can read; only admin/head can write
create policy "snapshots_select_all" on metric_snapshots for select using (auth.role() = 'authenticated');
create policy "snapshots_insert_admin_head" on metric_snapshots for insert with check (
  current_role_name() in ('admin', 'head')
);

-- competitors: all authenticated can read; admin can write
create policy "competitors_select_all" on competitors for select using (auth.role() = 'authenticated');
create policy "competitors_write_admin" on competitors for all using (
  current_role_name() = 'admin'
) with check (current_role_name() = 'admin');

-- tracked_keywords: all authenticated can read; admin/head can write
create policy "keywords_select_all" on tracked_keywords for select using (auth.role() = 'authenticated');
create policy "keywords_write_admin_head" on tracked_keywords for all using (
  current_role_name() in ('admin', 'head')
) with check (current_role_name() in ('admin', 'head'));

-- keyword_history: all authenticated can read; admin/head can write
create policy "keyword_history_select_all" on keyword_history for select using (auth.role() = 'authenticated');
create policy "keyword_history_write_admin_head" on keyword_history for all using (
  current_role_name() in ('admin', 'head')
) with check (current_role_name() in ('admin', 'head'));

-- audit_reports: all authenticated can read; admin/head can write
create policy "audit_select_all" on audit_reports for select using (auth.role() = 'authenticated');
create policy "audit_write_admin_head" on audit_reports for all using (
  current_role_name() in ('admin', 'head')
) with check (current_role_name() in ('admin', 'head'));

-- weekly_reports: all authenticated can read (v1: no writer path yet)
create policy "weekly_reports_select_all" on weekly_reports for select using (auth.role() = 'authenticated');
```

Note: server-side mutation routes (Task 11+) use the Supabase **service-role** client, which bypasses RLS, and enforce permissions in application code against the caller's `profiles.role` — RLS here is the defense-in-depth backstop for any direct client-side access via the anon key.

- [ ] **Step 3: Document manual apply step**

In `README.md`, add a "Database setup" section:
```markdown
## Database setup
1. Create a Supabase project at supabase.com.
2. In the SQL Editor, run `supabase/migrations/0001_initial_schema.sql`, then `supabase/migrations/0002_rls_policies.sql`, then `supabase/seed.sql` (added in a later task).
3. Copy the project URL, anon key, and service role key into `.env.local` (see `.env.local.example`).
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations README.md
git commit -m "feat: add database schema and RLS policy migrations"
```

---

## Task 4: Supabase clients

**Files:**
- Create: `lib/supabase/server.ts`
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/admin.ts`
- Create: `lib/supabase/types.ts`

**Interfaces:**
- Consumes: env vars `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- Produces: `createServerSupabaseClient()` (async, cookie-bound, for Server Components/Route Handlers acting as the current user), `createBrowserSupabaseClient()` (for Client Components), `createAdminSupabaseClient()` (service-role, server-only, for privileged Route Handlers). All later tasks that touch the DB use exactly these three functions.

- [ ] **Step 1: Write `lib/supabase/types.ts`** (thin placeholder for generated types)

```typescript
export type Database = Record<string, unknown>
```

- [ ] **Step 2: Write `lib/supabase/server.ts`**

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from './types'

export async function createServerSupabaseClient() {
  const cookieStore = await cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // called from a Server Component; middleware refreshes the session instead
          }
        },
      },
    }
  )
}
```

- [ ] **Step 3: Write `lib/supabase/client.ts`**

```typescript
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './types'

export function createBrowserSupabaseClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 4: Write `lib/supabase/admin.ts`**

```typescript
import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

export function createAdminSupabaseClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
```

- [ ] **Step 5: Verify build**

Run: `pnpm build`
Expected: succeeds.

- [ ] **Step 6: Commit**

```bash
git add lib/supabase
git commit -m "feat: add Supabase server, browser, and admin clients"
```

---

## Task 5: Constants — quarters, targets, accountability map, team roster

**Files:**
- Create: `lib/constants.ts`

**Interfaces:**
- Produces: `QUARTERLY_TARGETS: Record<'baseline'|'Q1'|'Q2'|'Q3'|'Q4'|'Q5', QuarterTarget>`, `ACCOUNTABILITY_MAP: Record<string, string[]>`, `QUARTER_BOUNDARIES: {label: string, start: string, end: string}[]`, `getCurrentQuarter(date: Date): string`, `TEAM_MEMBERS: {full_name: string, role: Role, job_title: string}[]`. Later tasks (dashboard, scorecard, seed script) import all of these — do not redefine target numbers elsewhere.

- [ ] **Step 1: Write failing unit test for `getCurrentQuarter`**

Create `lib/constants.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { getCurrentQuarter, QUARTER_BOUNDARIES } from './constants'

describe('getCurrentQuarter', () => {
  it('returns Q1 for a date inside the Q1 window', () => {
    expect(getCurrentQuarter(new Date('2026-09-01'))).toBe('Q1')
  })
  it('returns Q2 for a date inside the Q2 window', () => {
    expect(getCurrentQuarter(new Date('2026-11-15'))).toBe('Q2')
  })
  it('returns the last quarter label when past all boundaries', () => {
    expect(getCurrentQuarter(new Date('2028-01-01'))).toBe(
      QUARTER_BOUNDARIES[QUARTER_BOUNDARIES.length - 1].label
    )
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test lib/constants.test.ts`
Expected: FAIL — `./constants` has no exports yet.

- [ ] **Step 3: Write `lib/constants.ts`**

```typescript
import type { QuarterTarget, Role } from '@/types'

export const QUARTERLY_TARGETS: Record<
  'baseline' | 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'Q5',
  QuarterTarget
> = {
  baseline: {
    label: 'Baseline', date: '2026-08-23', domain_rating: 24,
    organic_traffic_global: 286, organic_traffic_us: 260,
    organic_keywords_global: 115, organic_keywords_us: 86,
    keywords_top_3: 16, keywords_top_10: 96, traffic_value_monthly: 1467,
    referring_domains_total: 861, referring_domains_quality: 35,
    avg_keywords_per_page: 2.5, indexed_content_pages: 45,
  },
  Q1: {
    label: 'Q1', date: '2026-09-30', domain_rating: 25,
    organic_traffic_global: 520, organic_traffic_us: 480,
    organic_keywords_global: 240, organic_keywords_us: 190,
    keywords_top_3: 34, keywords_top_10: 189, traffic_value_monthly: 2900,
    referring_domains_total: 900, referring_domains_quality: 75,
    avg_keywords_per_page: 4, indexed_content_pages: 60,
  },
  Q2: {
    label: 'Q2', date: '2026-12-31', domain_rating: 32,
    organic_traffic_global: 1600, organic_traffic_us: 1470,
    organic_keywords_global: 700, organic_keywords_us: 550,
    keywords_top_3: 105, keywords_top_10: 505, traffic_value_monthly: 8500,
    referring_domains_total: 1030, referring_domains_quality: 160,
    avg_keywords_per_page: 8, indexed_content_pages: 100,
  },
  Q3: {
    label: 'Q3', date: '2027-03-31', domain_rating: 39,
    organic_traffic_global: 2900, organic_traffic_us: 2670,
    organic_keywords_global: 1250, organic_keywords_us: 985,
    keywords_top_3: 205, keywords_top_10: 875, traffic_value_monthly: 16000,
    referring_domains_total: 1180, referring_domains_quality: 260,
    avg_keywords_per_page: 13, indexed_content_pages: 155,
  },
  Q4: {
    label: 'Q4', date: '2027-06-30', domain_rating: 45,
    organic_traffic_global: 4800, organic_traffic_us: 4450,
    organic_keywords_global: 1950, organic_keywords_us: 1540,
    keywords_top_3: 370, keywords_top_10: 1390, traffic_value_monthly: 28000,
    referring_domains_total: 1350, referring_domains_quality: 370,
    avg_keywords_per_page: 18, indexed_content_pages: 210,
  },
  Q5: {
    label: 'Q5', date: '2027-09-30', domain_rating: 50,
    organic_traffic_global: 7500, organic_traffic_us: 6990,
    organic_keywords_global: 2800, organic_keywords_us: 2205,
    keywords_top_3: 570, keywords_top_10: 2000, traffic_value_monthly: 46000,
    referring_domains_total: 1540, referring_domains_quality: 490,
    avg_keywords_per_page: 23, indexed_content_pages: 260,
  },
}

export const ACCOUNTABILITY_MAP: Record<string, string[]> = {
  domain_rating: ['Talha Azeem', 'Syed Ali'],
  referring_domains_quality: ['Syed Ali'],
  referring_domains_total: ['Syed Ali'],
  keywords_top_3: ['Lavi Shamoon', 'Najma Furqan'],
  organic_keywords_global: ['Lavi Shamoon', 'Najma Furqan'],
  avg_keywords_per_page: ['Talha Azeem', 'Najma Furqan'],
  indexed_content_pages: ['Lavi Shamoon'],
  traffic_value_monthly: ['Najma Furqan', 'Tabish Khalid'],
  organic_traffic_us: ['Najma Furqan', 'Tabish Khalid'],
  organic_traffic_global: ['All owners'],
}

export const QUARTER_BOUNDARIES: { label: string; start: string; end: string }[] = [
  { label: 'Q1', start: '2026-08-24', end: '2026-09-30' },
  { label: 'Q2', start: '2026-10-01', end: '2026-12-31' },
  { label: 'Q3', start: '2027-01-01', end: '2027-03-31' },
  { label: 'Q4', start: '2027-04-01', end: '2027-06-30' },
  { label: 'Q5', start: '2027-07-01', end: '2027-09-30' },
]

export function getCurrentQuarter(date: Date): string {
  const iso = date.toISOString().slice(0, 10)
  for (const q of QUARTER_BOUNDARIES) {
    if (iso >= q.start && iso <= q.end) return q.label
  }
  if (iso < QUARTER_BOUNDARIES[0].start) return QUARTER_BOUNDARIES[0].label
  return QUARTER_BOUNDARIES[QUARTER_BOUNDARIES.length - 1].label
}

export const TEAM_MEMBERS: { full_name: string; role: Role; job_title: string }[] = [
  { full_name: 'Abdullah Shekha', role: 'admin', job_title: 'Analyst / Supervisor' },
  { full_name: 'Tabish Khalid', role: 'head', job_title: 'Head of SEO & Content' },
  { full_name: 'Talha Azeem', role: 'owner', job_title: 'Technical SEO / Content Strategist' },
  { full_name: 'Usman Ali', role: 'owner', job_title: 'Web Developer' },
  { full_name: 'Najma Furqan', role: 'owner', job_title: 'Content Strategy Execution / Editor' },
  { full_name: 'Lavi Shamoon', role: 'owner', job_title: 'SME Writer' },
  { full_name: 'Syed Ali', role: 'owner', job_title: 'Director of Marketing' },
  { full_name: 'Hameed Ishaq', role: 'owner', job_title: 'Designer' },
  { full_name: 'Haroon', role: 'leadership', job_title: 'Leadership / CMO' },
  { full_name: 'Adeela', role: 'leadership', job_title: 'CPA Reviewer' },
]
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test lib/constants.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/constants.ts lib/constants.test.ts
git commit -m "feat: add quarterly targets, accountability map, and quarter-boundary logic"
```

---

## Task 6: RAG calculation logic

**Files:**
- Create: `lib/rag.ts`
- Create: `lib/rag.test.ts`

**Interfaces:**
- Produces: `calculateRAG(actual: number | null, target: number): RAGStatus`. Later tasks (dashboard stat tiles, scorecard table) import this exact function.

- [ ] **Step 1: Write failing test**

```typescript
import { describe, it, expect } from 'vitest'
import { calculateRAG } from './rag'

describe('calculateRAG', () => {
  it('returns no-data when actual is null', () => {
    expect(calculateRAG(null, 100)).toBe('no-data')
  })
  it('returns green at or above 95% of target', () => {
    expect(calculateRAG(95, 100)).toBe('green')
    expect(calculateRAG(120, 100)).toBe('green')
  })
  it('returns amber between 80% and 94% of target', () => {
    expect(calculateRAG(80, 100)).toBe('amber')
    expect(calculateRAG(94, 100)).toBe('amber')
  })
  it('returns red below 80% of target', () => {
    expect(calculateRAG(79, 100)).toBe('red')
    expect(calculateRAG(0, 100)).toBe('red')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test lib/rag.test.ts`
Expected: FAIL — `./rag` module not found.

- [ ] **Step 3: Write `lib/rag.ts`**

```typescript
import type { RAGStatus } from '@/types'

export function calculateRAG(actual: number | null | undefined, target: number): RAGStatus {
  if (actual === null || actual === undefined) return 'no-data'
  const pct = actual / target
  if (pct >= 0.95) return 'green'
  if (pct >= 0.8) return 'amber'
  return 'red'
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test lib/rag.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/rag.ts lib/rag.test.ts
git commit -m "feat: add RAG status calculation"
```

---

## Task 7: Auth — login page, middleware, session helpers

**Files:**
- Create: `app/(auth)/login/page.tsx`
- Create: `app/(auth)/login/actions.ts`
- Create: `middleware.ts`
- Create: `lib/auth.ts`

**Interfaces:**
- Consumes: `createServerSupabaseClient` (Task 4).
- Produces: `getCurrentProfile(): Promise<Profile | null>` (server-only helper reading the session + joined `profiles` row). All authenticated pages (Tasks 8–16) call this to get the current user's role.

- [ ] **Step 1: Write `middleware.ts`**

```typescript
import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const isLoginRoute = request.nextUrl.pathname.startsWith('/login')

  if (!user && !isLoginRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && isLoginRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  if (user && request.nextUrl.pathname.startsWith('/admin')) {
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

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

- [ ] **Step 2: Write `lib/auth.ts`**

```typescript
import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { Profile } from '@/types'

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  return (data as Profile) ?? null
}
```

- [ ] **Step 3: Write `app/(auth)/login/actions.ts`**

```typescript
'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function signIn(formData: FormData) {
  const email = String(formData.get('email') ?? '')
  const password = String(formData.get('password') ?? '')
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`)
  }
  redirect('/dashboard')
}
```

- [ ] **Step 4: Write `app/(auth)/login/page.tsx`**

```tsx
import { signIn } from './actions'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="w-full max-w-sm rounded-lg border bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold text-slate-900">EA SEO Tracker</h1>
        <p className="mb-6 text-sm text-slate-500">Sign in with your EA account</p>
        {error && (
          <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}
        <form action={signIn} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-md bg-slate-900 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Sign in
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Verify build**

Run: `pnpm build`
Expected: succeeds.

- [ ] **Step 6: Commit**

```bash
git add middleware.ts lib/auth.ts "app/(auth)"
git commit -m "feat: add login page, auth middleware, and current-profile helper"
```

---

## Task 8: Dashboard shell — sidebar, topbar, role-aware nav

**Files:**
- Create: `app/(dashboard)/layout.tsx`
- Create: `components/layout/sidebar.tsx`
- Create: `components/layout/topbar.tsx`
- Create: `components/layout/sign-out-button.tsx`
- Create: `app/page.tsx`

**Interfaces:**
- Consumes: `getCurrentProfile` (Task 7).
- Produces: the `(dashboard)` route group layout that every page in Tasks 9–15 renders inside. Nav items are filtered by `profile.role`.

- [ ] **Step 1: Write `app/page.tsx`** (root redirect)

```tsx
import { redirect } from 'next/navigation'

export default function RootPage() {
  redirect('/dashboard')
}
```

- [ ] **Step 2: Write `components/layout/sign-out-button.tsx`**

```tsx
'use client'

import { createBrowserSupabaseClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export function SignOutButton() {
  const router = useRouter()
  const supabase = createBrowserSupabaseClient()
  return (
    <button
      onClick={async () => {
        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
      }}
      className="text-sm text-slate-500 hover:text-slate-900"
    >
      Sign out
    </button>
  )
}
```

- [ ] **Step 3: Write `components/layout/sidebar.tsx`**

```tsx
import Link from 'next/link'
import type { Profile } from '@/types'

const NAV_ITEMS: { href: string; label: string; roles?: Profile['role'][] }[] = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/tasks', label: 'Tasks' },
  { href: '/scorecard', label: 'Scorecard' },
  { href: '/competitors', label: 'Competitors' },
  { href: '/keywords', label: 'Keywords' },
  { href: '/audit', label: 'Audit Reports' },
  { href: '/admin', label: 'Admin', roles: ['admin'] },
]

export function Sidebar({ role }: { role: Profile['role'] }) {
  const items = NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role))
  return (
    <nav className="flex h-full w-56 flex-col gap-1 border-r bg-white p-4">
      <div className="mb-4 px-2 text-lg font-semibold text-slate-900">EA SEO Tracker</div>
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  )
}
```

- [ ] **Step 4: Write `components/layout/topbar.tsx`**

```tsx
import type { Profile } from '@/types'
import { SignOutButton } from './sign-out-button'

export function Topbar({ profile }: { profile: Profile }) {
  return (
    <header className="flex h-14 items-center justify-between border-b bg-white px-6">
      <div className="text-sm text-slate-500">Signed in as {profile.full_name} · {profile.role}</div>
      <SignOutButton />
    </header>
  )
}
```

- [ ] **Step 5: Write `app/(dashboard)/layout.tsx`**

```tsx
import { redirect } from 'next/navigation'
import { getCurrentProfile } from '@/lib/auth'
import { Sidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')

  return (
    <div className="flex h-screen min-w-[1024px]">
      <Sidebar role={profile.role} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar profile={profile} />
        <main className="flex-1 overflow-y-auto bg-slate-50 p-6">{children}</main>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Verify build**

Run: `pnpm build`
Expected: succeeds (pages referenced by the sidebar don't exist yet — that's fine, `Link` doesn't fail the build for future routes).

- [ ] **Step 7: Commit**

```bash
git add app/page.tsx "app/(dashboard)/layout.tsx" components/layout
git commit -m "feat: add dashboard shell with role-aware sidebar and topbar"
```

---

## Task 9: Ahrefs client (stubbed) + admin metrics query helpers

**Files:**
- Create: `lib/ahrefs/client.ts`
- Create: `lib/ahrefs/fixtures.ts`
- Create: `lib/metrics.ts`

**Interfaces:**
- Produces: `fetchAhrefsMetrics(domain: string): Promise<AhrefsMetricsResult>` (stubbed — returns fixture data keyed by domain, never makes an HTTP call in v1), and `getLatestSnapshot(supabase): Promise<MetricSnapshot | null>` / `getAllSnapshots(supabase): Promise<MetricSnapshot[]>`. Task 10 (sync route) and Task 11 (dashboard) depend on both.

- [ ] **Step 1: Write `lib/ahrefs/fixtures.ts`**

```typescript
export interface AhrefsMetricsResult {
  domain_rating: number
  organic_traffic: number
  organic_keywords: number
  keywords_top_3: number
  keywords_top_10: number
  traffic_value_monthly: number
  referring_domains_total: number
  avg_keywords_per_page: number
  indexed_content_pages: number
}

// Fixture data standing in for a real Ahrefs v3 Site Explorer response
// until AHREFS_API_KEY is configured (CLAUDE.md Section 7.1).
export const AHREFS_FIXTURES: Record<string, AhrefsMetricsResult> = {
  'expertiseaccelerated.com': {
    domain_rating: 26, organic_traffic: 540, organic_keywords: 245,
    keywords_top_3: 36, keywords_top_10: 192, traffic_value_monthly: 3050,
    referring_domains_total: 905, avg_keywords_per_page: 4.1,
    indexed_content_pages: 61,
  },
}
```

- [ ] **Step 2: Write `lib/ahrefs/client.ts`**

```typescript
import { AHREFS_FIXTURES, type AhrefsMetricsResult } from './fixtures'

export async function fetchAhrefsMetrics(domain: string): Promise<AhrefsMetricsResult> {
  if (!process.env.AHREFS_API_KEY) {
    const fixture = AHREFS_FIXTURES[domain]
    if (!fixture) {
      throw new Error(`No Ahrefs fixture configured for domain "${domain}"`)
    }
    return fixture
  }

  // Live path — wired for CLAUDE.md Section 7.1 once AHREFS_API_KEY is set.
  // Rate limit: 1 request/second (Section 7.1) — callers must not fan this out unthrottled.
  const res = await fetch(
    `https://api.ahrefs.com/v3/site-explorer/metrics?target=${encodeURIComponent(domain)}&mode=subdomains`,
    { headers: { Authorization: `Bearer ${process.env.AHREFS_API_KEY}` } }
  )
  if (!res.ok) throw new Error(`Ahrefs API error: ${res.status} ${res.statusText}`)
  return res.json()
}
```

- [ ] **Step 3: Write `lib/metrics.ts`**

```typescript
import type { SupabaseClient } from '@supabase/supabase-js'
import type { MetricSnapshot } from '@/types'

export async function getLatestSnapshot(
  supabase: SupabaseClient
): Promise<MetricSnapshot | null> {
  const { data } = await supabase
    .from('metric_snapshots')
    .select('*')
    .order('snapshot_date', { ascending: false })
    .limit(1)
    .maybeSingle()
  return (data as MetricSnapshot) ?? null
}

export async function getAllSnapshots(supabase: SupabaseClient): Promise<MetricSnapshot[]> {
  const { data } = await supabase
    .from('metric_snapshots')
    .select('*')
    .order('snapshot_date', { ascending: true })
  return (data as MetricSnapshot[]) ?? []
}
```

- [ ] **Step 4: Write unit test for the stub fallback**

Create `lib/ahrefs/client.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { fetchAhrefsMetrics } from './client'

describe('fetchAhrefsMetrics (no API key)', () => {
  it('returns fixture data for a known domain', async () => {
    const result = await fetchAhrefsMetrics('expertiseaccelerated.com')
    expect(result.domain_rating).toBe(26)
  })
  it('throws for an unknown domain', async () => {
    await expect(fetchAhrefsMetrics('unknown-domain.com')).rejects.toThrow()
  })
})
```

- [ ] **Step 5: Run test**

Run: `pnpm test lib/ahrefs/client.test.ts`
Expected: PASS (2 tests) — confirm `AHREFS_API_KEY` is unset in the test env (it is, by default, since `.env.local` doesn't exist yet).

- [ ] **Step 6: Commit**

```bash
git add lib/ahrefs lib/metrics.ts
git commit -m "feat: add stubbed Ahrefs client and metric snapshot query helpers"
```

---

## Task 10: Ahrefs sync route

**Files:**
- Create: `app/api/sync/ahrefs/route.ts`

**Interfaces:**
- Consumes: `fetchAhrefsMetrics` (Task 9), `createAdminSupabaseClient` + `createServerSupabaseClient` (Task 4), `getCurrentProfile` (Task 7).
- Produces: `POST /api/sync/ahrefs` — admin/head only. Inserts one new `metric_snapshots` row derived from the Ahrefs fixture, mapped onto the current quarter label, **never writing `referring_domains_quality`** (Section 12.3 — manual only). Task 11's dashboard "Sync" button calls this.

- [ ] **Step 1: Write `app/api/sync/ahrefs/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/auth'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { fetchAhrefsMetrics } from '@/lib/ahrefs/client'
import { getCurrentQuarter } from '@/lib/constants'

const TARGET_DOMAIN = 'expertiseaccelerated.com'

export async function POST() {
  const profile = await getCurrentProfile()
  if (!profile || !['admin', 'head'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let metrics
  try {
    metrics = await fetchAhrefsMetrics(TARGET_DOMAIN)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Ahrefs sync failed' },
      { status: 502 }
    )
  }

  const admin = createAdminSupabaseClient()
  const quarter = getCurrentQuarter(new Date())

  const { data, error } = await admin
    .from('metric_snapshots')
    .insert({
      snapshot_date: new Date().toISOString().slice(0, 10),
      quarter_label: quarter,
      domain_rating: metrics.domain_rating,
      organic_traffic_global: metrics.organic_traffic,
      organic_traffic_us: null,
      organic_keywords_global: metrics.organic_keywords,
      organic_keywords_us: null,
      keywords_top_3: metrics.keywords_top_3,
      keywords_top_10: metrics.keywords_top_10,
      traffic_value_monthly: metrics.traffic_value_monthly,
      referring_domains_total: metrics.referring_domains_total,
      avg_keywords_per_page: metrics.avg_keywords_per_page,
      indexed_content_pages: metrics.indexed_content_pages,
      created_by: profile.id,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ snapshot: data })
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add app/api/sync
git commit -m "feat: add admin/head-only Ahrefs sync route"
```

---

## Task 11: Dashboard page — 12 KPI stat tiles

**Files:**
- Create: `app/(dashboard)/dashboard/page.tsx`
- Create: `components/dashboard/stat-tile.tsx`
- Create: `components/dashboard/sync-button.tsx`
- Create: `components/dashboard/rag-badge.tsx`

**Interfaces:**
- Consumes: `getCurrentProfile`, `getLatestSnapshot`, `QUARTERLY_TARGETS`, `getCurrentQuarter`, `calculateRAG`.
- Produces: the `/dashboard` route — server-rendered stat tiles for all 12 KPIs (Section 8.2), each showing current value, target, % variance, and RAG badge. No charts/sparklines (v2 scope, Section 13).

- [ ] **Step 1: Write `components/dashboard/rag-badge.tsx`**

```tsx
import type { RAGStatus } from '@/types'
import { Badge } from '@/components/ui/badge'

const STYLES: Record<RAGStatus, string> = {
  green: 'bg-green-100 text-green-800 hover:bg-green-100',
  amber: 'bg-amber-100 text-amber-800 hover:bg-amber-100',
  red: 'bg-red-100 text-red-800 hover:bg-red-100',
  'no-data': 'bg-slate-100 text-slate-600 hover:bg-slate-100',
}

const LABELS: Record<RAGStatus, string> = {
  green: 'On track', amber: 'At risk', red: 'Off track', 'no-data': 'No data',
}

export function RagBadge({ status }: { status: RAGStatus }) {
  return <Badge className={STYLES[status]}>{LABELS[status]}</Badge>
}
```

- [ ] **Step 2: Write `components/dashboard/stat-tile.tsx`**

```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { calculateRAG } from '@/lib/rag'
import { RagBadge } from './rag-badge'

export function StatTile({
  label,
  actual,
  target,
  format,
}: {
  label: string
  actual: number | null
  target: number
  format?: (n: number) => string
}) {
  const status = calculateRAG(actual, target)
  const fmt = format ?? ((n: number) => n.toLocaleString())
  const variance = actual !== null ? ((actual - target) / target) * 100 : null

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-slate-500">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-semibold text-slate-900">
            {actual !== null ? fmt(actual) : '—'}
          </span>
          <RagBadge status={status} />
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Target: {fmt(target)}
          {variance !== null && (
            <span className={variance >= 0 ? ' text-green-600' : ' text-red-600'}>
              {' '}({variance >= 0 ? '+' : ''}{variance.toFixed(1)}%)
            </span>
          )}
        </p>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 3: Write `components/dashboard/sync-button.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export function SyncButton() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  return (
    <Button
      disabled={loading}
      onClick={async () => {
        setLoading(true)
        try {
          const res = await fetch('/api/sync/ahrefs', { method: 'POST' })
          if (!res.ok) {
            const body = await res.json().catch(() => ({}))
            alert(body.error ?? 'Sync failed')
            return
          }
          router.refresh()
        } finally {
          setLoading(false)
        }
      }}
    >
      {loading ? 'Syncing…' : 'Sync Ahrefs data'}
    </Button>
  )
}
```

- [ ] **Step 4: Write `app/(dashboard)/dashboard/page.tsx`**

```tsx
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/auth'
import { getLatestSnapshot } from '@/lib/metrics'
import { QUARTERLY_TARGETS, getCurrentQuarter } from '@/lib/constants'
import { StatTile } from '@/components/dashboard/stat-tile'
import { SyncButton } from '@/components/dashboard/sync-button'

const currency = (n: number) => `$${n.toLocaleString()}`
const decimal = (n: number) => n.toFixed(1)

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()
  const profile = await getCurrentProfile()
  const snapshot = await getLatestSnapshot(supabase)
  const quarter = getCurrentQuarter(new Date()) as keyof typeof QUARTERLY_TARGETS
  const targets = QUARTERLY_TARGETS[quarter] ?? QUARTERLY_TARGETS.Q1
  const canSync = profile && ['admin', 'head'].includes(profile.role)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            {targets.label} — Target date: {new Date(targets.date).toLocaleDateString('en-GB', {
              day: '2-digit', month: 'short', year: 'numeric',
            })}
          </h1>
          <p className="text-sm text-slate-500">
            Last sync: {snapshot ? new Date(snapshot.created_at).toLocaleString() : 'never'}
          </p>
        </div>
        {canSync && <SyncButton />}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Domain Rating" actual={snapshot?.domain_rating ?? null} target={targets.domain_rating} />
        <StatTile label="Organic Traffic / mo (Global)" actual={snapshot?.organic_traffic_global ?? null} target={targets.organic_traffic_global} />
        <StatTile label="Organic Traffic / mo (US)" actual={snapshot?.organic_traffic_us ?? null} target={targets.organic_traffic_us} />
        <StatTile label="Organic Keywords (Global)" actual={snapshot?.organic_keywords_global ?? null} target={targets.organic_keywords_global} />
        <StatTile label="Organic Keywords (US)" actual={snapshot?.organic_keywords_us ?? null} target={targets.organic_keywords_us} />
        <StatTile label="Keywords Ranked #1–3" actual={snapshot?.keywords_top_3 ?? null} target={targets.keywords_top_3} />
        <StatTile label="Keywords in Top 10" actual={snapshot?.keywords_top_10 ?? null} target={targets.keywords_top_10} />
        <StatTile label="Est. Traffic Value / mo" actual={snapshot?.traffic_value_monthly ?? null} target={targets.traffic_value_monthly} format={currency} />
        <StatTile label="Referring Domains (Total)" actual={snapshot?.referring_domains_total ?? null} target={targets.referring_domains_total} />
        <StatTile label="Quality Ref. Domains (DR30+, dofollow)" actual={snapshot?.referring_domains_quality ?? null} target={targets.referring_domains_quality} />
        <StatTile label="Avg. Keywords per Ranking Page" actual={snapshot?.avg_keywords_per_page ?? null} target={targets.avg_keywords_per_page} format={decimal} />
        <StatTile label="Live Indexed Content Pages" actual={snapshot?.indexed_content_pages ?? null} target={targets.indexed_content_pages} />
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Verify build**

Run: `pnpm build`
Expected: succeeds.

- [ ] **Step 6: Commit**

```bash
git add "app/(dashboard)/dashboard" components/dashboard
git commit -m "feat: add main dashboard with 12 KPI stat tiles and manual sync"
```

---

## Task 12: Seed data script

**Files:**
- Create: `supabase/seed.sql`
- Create: `scripts/seed-users.ts`

**Interfaces:**
- Consumes: `createAdminSupabaseClient` (Task 4), `TEAM_MEMBERS` (Task 5).
- Produces: a repeatable seeding path — `scripts/seed-users.ts` creates the 9 auth users + `profiles` rows (run once against a real Supabase project); `supabase/seed.sql` seeds the 34 tasks, baseline `metric_snapshots` row, and the pre-seeded audit findings, referencing profiles by `full_name` lookup so it can run any time after users exist.

- [ ] **Step 1: Write `scripts/seed-users.ts`**

```typescript
import { createClient } from '@supabase/supabase-js'
import { TEAM_MEMBERS } from '../lib/constants'

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running this script')
  }
  const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

  for (const member of TEAM_MEMBERS) {
    const email = `${member.full_name.toLowerCase().replace(/\s+/g, '.')}@eaccelerated.com`
    const tempPassword = crypto.randomUUID()

    const { data: created, error } = await admin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
    })
    if (error) {
      console.error(`Failed to create ${email}:`, error.message)
      continue
    }

    const { error: profileError } = await admin.from('profiles').insert({
      id: created.user.id,
      full_name: member.full_name,
      role: member.role,
      job_title: member.job_title,
    })
    if (profileError) {
      console.error(`Failed to create profile for ${email}:`, profileError.message)
      continue
    }

    console.log(`Created ${email} (role: ${member.role}) — temp password: ${tempPassword}`)
  }
}

main().then(() => process.exit(0))
```

Add to `package.json` scripts: `"seed:users": "tsx scripts/seed-users.ts"`. Run `pnpm add -D tsx`.

- [ ] **Step 2: Write `supabase/seed.sql`**

```sql
-- Run AFTER scripts/seed-users.ts has created the 9 profiles.

insert into tasks (action_number, title, position_responsible, assigned_to, co_assigned_to, due_date, quarter)
select 'A1', 'Terminate paid link-building vendor',
  'Haroon', (select id from profiles where full_name = 'Haroon'),
  (select id from profiles where full_name = 'Tabish Khalid'), '2026-08-27', 'Q1'
union all select 'A2', 'Programme kickoff and RACI sign-off',
  'Tabish Khalid', (select id from profiles where full_name = 'Tabish Khalid'),
  null, '2026-08-27', 'Q1'
union all select 'A3', 'Agree CPA review SLA',
  'Haroon', (select id from profiles where full_name = 'Haroon'),
  (select id from profiles where full_name = 'Najma Furqan'), '2026-08-27', 'Q1'
union all select 'A4', 'Assign cross-training backups',
  'Tabish Khalid', (select id from profiles where full_name = 'Tabish Khalid'),
  null, '2026-08-29', 'Q1'
union all select 'A5', 'Stand up tracking infrastructure',
  'Abdullah Shekha', (select id from profiles where full_name = 'Abdullah Shekha'),
  null, '2026-08-29', 'Q1'
union all select 'A6', 'Fix eaccelerated.com redirect (302→301)',
  'Usman Ali', (select id from profiles where full_name = 'Usman Ali'),
  (select id from profiles where full_name = 'Talha Azeem'), '2026-08-29', 'Q1'
union all select 'A7', 'Classify full referring-domain list (all 861)',
  'Talha Azeem', (select id from profiles where full_name = 'Talha Azeem'),
  null, '2026-09-02', 'Q1'
union all select 'A8', 'Resolve UR 9.9 Cloudflare 404',
  'Usman Ali', (select id from profiles where full_name = 'Usman Ali'),
  (select id from profiles where full_name = 'Talha Azeem'), '2026-09-02', 'Q1'
union all select 'A9', 'Brief all 15 striking-distance pages',
  'Najma Furqan', (select id from profiles where full_name = 'Najma Furqan'),
  null, '2026-09-02', 'Q1'
union all select 'A10', 'File disavow in Search Console',
  'Talha Azeem', (select id from profiles where full_name = 'Talha Azeem'),
  null, '2026-09-05', 'Q1'
union all select 'A11', 'Recover UR 11.7 redirect chains',
  'Usman Ali', (select id from profiles where full_name = 'Usman Ali'),
  (select id from profiles where full_name = 'Talha Azeem'), '2026-09-05', 'Q1'
union all select 'A12', 'Restore /fractional-cfo-services/',
  'Talha Azeem', (select id from profiles where full_name = 'Talha Azeem'),
  (select id from profiles where full_name = 'Najma Furqan'), '2026-09-05', 'Q1'
union all select 'A13', 'Resolve HTTP/HTTPS duplication',
  'Usman Ali', (select id from profiles where full_name = 'Usman Ali'),
  (select id from profiles where full_name = 'Talha Azeem'), '2026-09-12', 'Q1'
union all select 'A14', 'Resolve keyword cannibalisation',
  'Talha Azeem', (select id from profiles where full_name = 'Talha Azeem'),
  (select id from profiles where full_name = 'Najma Furqan'), '2026-09-12', 'Q1'
union all select 'A15', 'Implement schema markup (Org, Service, FAQ, Breadcrumb)',
  'Usman Ali', (select id from profiles where full_name = 'Usman Ali'),
  (select id from profiles where full_name = 'Talha Azeem'), '2026-09-12', 'Q1'
union all select 'A16', 'Claim software partner directories',
  'Syed Ali', (select id from profiles where full_name = 'Syed Ali'),
  null, '2026-09-12', 'Q1'
union all select 'A17', 'Claim TPM / CPG vendor listings',
  'Syed Ali', (select id from profiles where full_name = 'Syed Ali'),
  null, '2026-09-19', 'Q1'
union all select 'A18', 'Full Ahrefs Site Audit and remediation',
  'Talha Azeem', (select id from profiles where full_name = 'Talha Azeem'),
  (select id from profiles where full_name = 'Usman Ali'), '2026-09-26', 'Q1'
union all select 'A19', 'Optimise all 15 striking-distance pages',
  'Lavi Shamoon', (select id from profiles where full_name = 'Lavi Shamoon'),
  (select id from profiles where full_name = 'Najma Furqan'), '2026-09-30', 'Q1'
union all select 'A20', 'Implement silo internal linking',
  'Talha Azeem', (select id from profiles where full_name = 'Talha Azeem'),
  (select id from profiles where full_name = 'Najma Furqan'), '2026-09-30', 'Q1'
union all select 'A21', 'Join chambers and associations',
  'Syed Ali', (select id from profiles where full_name = 'Syed Ali'),
  (select id from profiles where full_name = 'Haroon'), '2026-09-30', 'Q1'
union all select 'A22', 'Field CPG Benchmark survey',
  'Syed Ali', (select id from profiles where full_name = 'Syed Ali'),
  (select id from profiles where full_name = 'Haroon'), '2026-09-30', 'Q1'
union all select 'A23', 'Optimise 7 non-ranking service pages',
  'Lavi Shamoon', (select id from profiles where full_name = 'Lavi Shamoon'),
  (select id from profiles where full_name = 'Najma Furqan'), '2026-10-31', 'Q2'
union all select 'A24', 'Build interactive calculators',
  'Hameed Ishaq', (select id from profiles where full_name = 'Hameed Ishaq'),
  (select id from profiles where full_name = 'Usman Ali'), '2026-11-30', 'Q2'
union all select 'A25', 'Launch glossary phase 1 (30 terms)',
  'Lavi Shamoon', (select id from profiles where full_name = 'Lavi Shamoon'),
  (select id from profiles where full_name = 'Najma Furqan'), '2026-11-30', 'Q2'
union all select 'A26', 'Publish CPG Finance Benchmark Report',
  'Syed Ali', (select id from profiles where full_name = 'Syed Ali'),
  (select id from profiles where full_name = 'Hameed Ishaq'), '2026-12-31', 'Q2'
union all select 'A27', 'Build 6 pillar pages',
  'Lavi Shamoon', (select id from profiles where full_name = 'Lavi Shamoon'),
  (select id from profiles where full_name = 'Najma Furqan'), '2026-12-31', 'Q2'
union all select 'A28', 'Complete podcast circuit round 1 (8+ appearances)',
  'Syed Ali', (select id from profiles where full_name = 'Syed Ali'),
  null, '2027-01-31', 'Q3'
union all select 'A29', 'Secure contributed columns (Forbes/Entrepreneur/Inc.)',
  'Syed Ali', (select id from profiles where full_name = 'Syed Ali'),
  null, '2027-02-28', 'Q3'
union all select 'A30', 'Glossary phase 2 (expand to 60 terms)',
  'Lavi Shamoon', (select id from profiles where full_name = 'Lavi Shamoon'),
  (select id from profiles where full_name = 'Najma Furqan'), '2027-03-31', 'Q3'
union all select 'A31', 'Conversion optimisation on money pages',
  'Najma Furqan', (select id from profiles where full_name = 'Najma Furqan'),
  (select id from profiles where full_name = 'Abdullah Shekha'), '2027-03-31', 'Q3'
union all select 'A32', 'Second research drop',
  'Syed Ali', (select id from profiles where full_name = 'Syed Ali'),
  (select id from profiles where full_name = 'Hameed Ishaq'), '2027-06-30', 'Q4'
union all select 'A33', 'Glossary phase 3 and vertical expansion (90 terms)',
  'Lavi Shamoon', (select id from profiles where full_name = 'Lavi Shamoon'),
  (select id from profiles where full_name = 'Najma Furqan'), '2027-09-30', 'Q5'
union all select 'A34', 'Re-run full report each quarter',
  'Tabish Khalid', (select id from profiles where full_name = 'Tabish Khalid'),
  (select id from profiles where full_name = 'Abdullah Shekha'), null, 'All';

insert into metric_snapshots (
  snapshot_date, quarter_label, domain_rating, organic_traffic_global, organic_traffic_us,
  organic_keywords_global, organic_keywords_us, keywords_top_3, keywords_top_10,
  traffic_value_monthly, referring_domains_total, referring_domains_quality,
  avg_keywords_per_page, indexed_content_pages, notes
) values (
  '2026-08-23', 'Baseline', 24, 286, 260, 115, 86, 16, 96, 1467, 861, 35, 2.5, 45,
  'Baseline snapshot per CLAUDE.md Section 10.3'
);

insert into audit_reports (title, category, severity, finding, recommendation, assigned_to) values
('Sold-backlink referring domains', 'backlink', 'critical',
 '17 referring domains explicitly advertise selling backlinks (pbnseolinks.shop, buybacklinks.agency, buyseobacklinks.shop, etc.)',
 'Disavow all 17 domains in Search Console', (select id from profiles where full_name = 'Talha Azeem')),
('High-equity URLs redirected', 'technical', 'critical',
 'Two highest-equity URLs (/accounts-payable/, /general-accounting-and-bookkeeping/ at UR 11.7) are 301 redirects',
 'Restore or properly consolidate these URLs', (select id from profiles where full_name = 'Usman Ali')),
('Cloudflare 404 with link equity', 'technical', 'critical',
 '/cdn-cgi/l/email-protection (UR 9.9) returns 404 — Cloudflare artefact with accumulated links',
 'Redirect to a relevant live page', (select id from profiles where full_name = 'Usman Ali')),
('Fractional CFO page redirected', 'technical', 'critical',
 '/fractional-cfo-services/ (UR 9.9) is a 301 redirect — target keyword worth 14,000 searches/mo at $10 CPC',
 'Restore this page as a live, optimised URL', (select id from profiles where full_name = 'Talha Azeem')),
('302 instead of 301 redirect', 'technical', 'high',
 'eaccelerated.com redirects with 302 (temporary) instead of 301 — not consolidating link equity',
 'Change redirect type to 301', (select id from profiles where full_name = 'Usman Ali')),
('HTTP/HTTPS duplication', 'technical', 'high',
 'HTTP and HTTPS versions of pages both return 200 — no canonical consolidation',
 'Force redirect HTTP to HTTPS and set canonical tags', (select id from profiles where full_name = 'Usman Ali')),
('Flat site architecture', 'architecture', 'high',
 'Perfectly flat site architecture — every page at UR 6.9, nothing prioritised',
 'Introduce hub-and-spoke silo structure', (select id from profiles where full_name = 'Talha Azeem')),
('Manufacturing accounting page not ranking', 'content', 'high',
 '/manufacturing-accounting/ exists but ranks for none of its head terms (KD 0)',
 'Rewrite and optimise for target keywords', (select id from profiles where full_name = 'Lavi Shamoon')),
('Ecommerce accounting page not ranking', 'content', 'high',
 '/ecommerce-accounting/ exists but ranks for none of its head terms',
 'Rewrite and optimise for target keywords', (select id from profiles where full_name = 'Lavi Shamoon')),
('Amazon accounting page not ranking', 'content', 'high',
 '/amazon-accounting/ exists but ranks for none of its head terms (KD 0)',
 'Rewrite and optimise for target keywords', (select id from profiles where full_name = 'Lavi Shamoon')),
('TPM page not ranking', 'content', 'high',
 '/trade-promotions-management/ exists but ranks for none of its head terms',
 'Rewrite and optimise for target keywords', (select id from profiles where full_name = 'Lavi Shamoon')),
('Fractional CFO traffic loss', 'content', 'high',
 '/fractional-cfo-services/ (301''d) — 14,000 searches/mo, EA earns zero traffic',
 'Restore and optimise this page', (select id from profiles where full_name = 'Najma Furqan')),
('Keyword cannibalisation', 'technical', 'medium',
 'Keyword cannibalisation: /blog/how-much-does-a-cpa-cost/ vs /cpa-cost/ competing on same intent',
 'Consolidate into a single canonical page', (select id from profiles where full_name = 'Talha Azeem')),
('Duplicate inventory pages', 'technical', 'medium',
 '/inventory-management/ and /inventory-management-services/ duplicated',
 'Merge or differentiate and canonicalise', (select id from profiles where full_name = 'Talha Azeem')),
('Duplicate blog hubs', 'technical', 'medium',
 '/blog/ and /blogs/ both exist — duplicate resource hub',
 'Consolidate into a single blog path with redirects', (select id from profiles where full_name = 'Usman Ali')),
('No hub-and-spoke linking', 'architecture', 'medium',
 'No hub-and-spoke internal linking — service, industry, location pages all isolated',
 'Build internal link matrix per silo', (select id from profiles where full_name = 'Talha Azeem')),
('No schema markup', 'technical', 'medium',
 'No schema markup deployed (Organization, Service, FAQPage, BreadcrumbList)',
 'Implement structured data across key templates', (select id from profiles where full_name = 'Usman Ali'));

insert into tracked_keywords (keyword, priority, category, target_url, monthly_volume, keyword_difficulty, cpc) values
('fractional cfo services', 'high', 'striking-distance', '/fractional-cfo-services/', 14000, 42, 10.50),
('cpa cost', 'high', 'striking-distance', '/cpa-cost/', 2400, 28, 6.20),
('manufacturing accounting', 'high', 'striking-distance', '/manufacturing-accounting/', 880, 22, 8.10),
('ecommerce accounting', 'high', 'striking-distance', '/ecommerce-accounting/', 1600, 31, 7.40),
('amazon accounting', 'medium', 'striking-distance', '/amazon-accounting/', 590, 19, 5.90),
('trade promotions management', 'medium', 'striking-distance', '/trade-promotions-management/', 320, 25, 9.80),
('inventory management services', 'medium', 'striking-distance', '/inventory-management-services/', 1100, 30, 6.60);
```

- [ ] **Step 3: Document seeding order in README**

Append to `README.md`:
```markdown
## Seeding order
1. Run migrations (see Database setup).
2. `pnpm seed:users` — creates the 9 auth users + profiles. Note the printed temp passwords.
3. Run `supabase/seed.sql` in the Supabase SQL editor — seeds the 34 tasks, baseline snapshot, audit findings, and starter keywords.
```

- [ ] **Step 4: Commit**

```bash
git add supabase/seed.sql scripts/seed-users.ts README.md package.json pnpm-lock.yaml
git commit -m "feat: add user/task/audit/keyword seed data"
```

---

## Task 13: Task tracker page — list view, filters, status update

**Files:**
- Create: `app/(dashboard)/tasks/page.tsx`
- Create: `app/api/tasks/[id]/route.ts`
- Create: `components/tasks/task-list.tsx`
- Create: `components/tasks/task-filters.tsx`
- Create: `components/tasks/task-status-select.tsx`
- Create: `components/tasks/q1-banner.tsx`

**Interfaces:**
- Consumes: `getCurrentProfile`, `createServerSupabaseClient`/`createAdminSupabaseClient`, `Task`/`TaskStatus` types.
- Produces: `/tasks` list view with filters (mine/all, quarter, status, owner, overdue) and `PATCH /api/tasks/[id]` for status/notes updates, permission-checked server-side (owner can only touch their own tasks; admin/head any). This is the list view only — Kanban and the slide-in detail panel with activity log are follow-up v1.1 polish and out of this task's scope; the API and permission model here are what those would build on.

- [ ] **Step 1: Write `app/api/tasks/[id]/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/auth'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const profile = await getCurrentProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminSupabaseClient()
  const { data: task } = await admin.from('tasks').select('assigned_to, co_assigned_to').eq('id', id).single()
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isOwnerOfTask = task.assigned_to === profile.id || task.co_assigned_to === profile.id
  const canEditAny = profile.role === 'admin' || profile.role === 'head'
  if (!canEditAny && !(profile.role === 'owner' && isOwnerOfTask)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const allowedFields: Record<string, unknown> = {}
  if (typeof body.status === 'string') allowedFields.status = body.status
  if (typeof body.notes === 'string') allowedFields.notes = body.notes
  if (allowedFields.status === 'completed') allowedFields.completed_at = new Date().toISOString()
  allowedFields.updated_at = new Date().toISOString()

  const { data, error } = await admin.from('tasks').update(allowedFields).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ task: data })
}
```

- [ ] **Step 2: Write `components/tasks/task-status-select.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { TaskStatus } from '@/types'

const STATUSES: TaskStatus[] = ['pending', 'in_progress', 'completed', 'blocked', 'overdue']

export function TaskStatusSelect({ taskId, status, disabled }: { taskId: string; status: TaskStatus; disabled: boolean }) {
  const [value, setValue] = useState(status)
  const router = useRouter()

  return (
    <select
      value={value}
      disabled={disabled}
      onChange={async (e) => {
        const next = e.target.value as TaskStatus
        setValue(next)
        await fetch(`/api/tasks/${taskId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: next }),
        })
        router.refresh()
      }}
      className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-50"
    >
      {STATUSES.map((s) => (
        <option key={s} value={s}>{s.replace('_', ' ')}</option>
      ))}
    </select>
  )
}
```

- [ ] **Step 3: Write `components/tasks/q1-banner.tsx`**

```tsx
export function Q1Banner() {
  return (
    <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800">
      Q1 Sprint — Actions A1–A22 due by 30 Sep 2026
    </div>
  )
}
```

- [ ] **Step 4: Write `components/tasks/task-filters.tsx`**

```tsx
'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import type { Profile } from '@/types'

export function TaskFilters({ owners }: { owners: Pick<Profile, 'id' | 'full_name'>[] }) {
  const router = useRouter()
  const params = useSearchParams()

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString())
    if (value) next.set(key, value)
    else next.delete(key)
    router.push(`/tasks?${next.toString()}`)
  }

  return (
    <div className="mb-4 flex flex-wrap gap-2">
      <select className="rounded border px-2 py-1 text-sm" defaultValue={params.get('mine') ?? ''} onChange={(e) => setParam('mine', e.target.value)}>
        <option value="">All tasks</option>
        <option value="1">My tasks only</option>
      </select>
      <select className="rounded border px-2 py-1 text-sm" defaultValue={params.get('quarter') ?? ''} onChange={(e) => setParam('quarter', e.target.value)}>
        <option value="">All quarters</option>
        {['Q1', 'Q2', 'Q3', 'Q4', 'Q5'].map((q) => <option key={q} value={q}>{q}</option>)}
      </select>
      <select className="rounded border px-2 py-1 text-sm" defaultValue={params.get('status') ?? ''} onChange={(e) => setParam('status', e.target.value)}>
        <option value="">All statuses</option>
        {['pending', 'in_progress', 'completed', 'blocked', 'overdue'].map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
      </select>
      <select className="rounded border px-2 py-1 text-sm" defaultValue={params.get('owner') ?? ''} onChange={(e) => setParam('owner', e.target.value)}>
        <option value="">All owners</option>
        {owners.map((o) => <option key={o.id} value={o.id}>{o.full_name}</option>)}
      </select>
      <select className="rounded border px-2 py-1 text-sm" defaultValue={params.get('overdue') ?? ''} onChange={(e) => setParam('overdue', e.target.value)}>
        <option value="">All</option>
        <option value="1">Overdue only</option>
      </select>
    </div>
  )
}
```

- [ ] **Step 5: Write `components/tasks/task-list.tsx`**

```tsx
import type { Profile, Task } from '@/types'
import { TaskStatusSelect } from './task-status-select'

export function TaskList({ tasks, currentProfile }: { tasks: Task[]; currentProfile: Profile }) {
  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="overflow-hidden rounded-md border bg-white">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
          <tr>
            <th className="px-4 py-2">Action</th>
            <th className="px-4 py-2">Title</th>
            <th className="px-4 py-2">Owner</th>
            <th className="px-4 py-2">Co-owner</th>
            <th className="px-4 py-2">Due</th>
            <th className="px-4 py-2">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {tasks.map((task) => {
            const isOverdue = !!task.due_date && task.due_date < today && task.status !== 'completed'
            const canEdit =
              currentProfile.role === 'admin' ||
              currentProfile.role === 'head' ||
              (currentProfile.role === 'owner' &&
                (task.assigned_to === currentProfile.id || task.co_assigned_to === currentProfile.id))

            return (
              <tr key={task.id}>
                <td className="px-4 py-2 font-medium text-slate-700">{task.action_number}</td>
                <td className="px-4 py-2 text-slate-900">{task.title}</td>
                <td className="px-4 py-2 text-slate-600">{task.assigned_profile?.full_name ?? '—'}</td>
                <td className="px-4 py-2 text-slate-600">{task.co_assigned_profile?.full_name ?? '—'}</td>
                <td className={`px-4 py-2 ${isOverdue ? 'font-medium text-red-600' : 'text-slate-600'}`}>
                  {task.due_date ?? 'Recurring'}
                </td>
                <td className="px-4 py-2">
                  <TaskStatusSelect taskId={task.id} status={task.status} disabled={!canEdit} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 6: Write `app/(dashboard)/tasks/page.tsx`**

```tsx
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/auth'
import { TaskList } from '@/components/tasks/task-list'
import { TaskFilters } from '@/components/tasks/task-filters'
import { Q1Banner } from '@/components/tasks/q1-banner'
import type { Task } from '@/types'

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')

  const params = await searchParams
  const supabase = await createServerSupabaseClient()

  let query = supabase
    .from('tasks')
    .select('*, assigned_profile:assigned_to(id, full_name, avatar_url), co_assigned_profile:co_assigned_to(id, full_name, avatar_url)')
    .order('action_number', { ascending: true })

  if (params.mine === '1') query = query.or(`assigned_to.eq.${profile.id},co_assigned_to.eq.${profile.id}`)
  if (params.quarter) query = query.eq('quarter', params.quarter)
  if (params.status) query = query.eq('status', params.status)
  if (params.owner) query = query.eq('assigned_to', params.owner)
  if (params.overdue === '1') query = query.lt('due_date', new Date().toISOString().slice(0, 10)).neq('status', 'completed')

  const { data: tasks } = await query
  const { data: owners } = await supabase.from('profiles').select('id, full_name').order('full_name')

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-slate-900">Task Tracker</h1>
      <Q1Banner />
      <TaskFilters owners={owners ?? []} />
      <TaskList tasks={(tasks as Task[]) ?? []} currentProfile={profile} />
    </div>
  )
}
```

- [ ] **Step 7: Verify build**

Run: `pnpm build`
Expected: succeeds.

- [ ] **Step 8: Commit**

```bash
git add "app/(dashboard)/tasks" app/api/tasks components/tasks
git commit -m "feat: add task tracker list view with filters and status updates"
```

---

## Task 14: Quarterly scorecard page

**Files:**
- Create: `app/(dashboard)/scorecard/page.tsx`
- Create: `components/scorecard/scorecard-table.tsx`
- Create: `components/scorecard/quarter-selector.tsx`

**Interfaces:**
- Consumes: `QUARTERLY_TARGETS`, `ACCOUNTABILITY_MAP`, `calculateRAG`, `getAllSnapshots`.
- Produces: `/scorecard?quarter=Q1` — table of the 12 metrics with target/actual/variance/RAG/accountable owner, defaulting to the most recent quarter with a snapshot.

- [ ] **Step 1: Write `components/scorecard/quarter-selector.tsx`**

```tsx
'use client'

import { useRouter, useSearchParams } from 'next/navigation'

const QUARTERS = ['baseline', 'Q1', 'Q2', 'Q3', 'Q4', 'Q5']

export function QuarterSelector({ current }: { current: string }) {
  const router = useRouter()
  const params = useSearchParams()

  return (
    <select
      value={current}
      onChange={(e) => {
        const next = new URLSearchParams(params.toString())
        next.set('quarter', e.target.value)
        router.push(`/scorecard?${next.toString()}`)
      }}
      className="rounded border px-3 py-1.5 text-sm"
    >
      {QUARTERS.map((q) => <option key={q} value={q}>{q === 'baseline' ? 'Baseline' : q}</option>)}
    </select>
  )
}
```

- [ ] **Step 2: Write `components/scorecard/scorecard-table.tsx`**

```tsx
import { calculateRAG } from '@/lib/rag'
import { ACCOUNTABILITY_MAP } from '@/lib/constants'
import { RagBadge } from '@/components/dashboard/rag-badge'
import type { MetricKey, MetricSnapshot, QuarterTarget } from '@/types'

const ROWS: { key: MetricKey; label: string }[] = [
  { key: 'domain_rating', label: 'Domain Rating' },
  { key: 'organic_traffic_global', label: 'Organic Traffic / mo (Global)' },
  { key: 'organic_traffic_us', label: 'Organic Traffic / mo (US)' },
  { key: 'organic_keywords_global', label: 'Organic Keywords (Global)' },
  { key: 'organic_keywords_us', label: 'Organic Keywords (US)' },
  { key: 'keywords_top_3', label: 'Keywords Ranked #1–3' },
  { key: 'keywords_top_10', label: 'Keywords in Top 10' },
  { key: 'traffic_value_monthly', label: 'Est. Traffic Value / mo' },
  { key: 'referring_domains_total', label: 'Referring Domains (Total)' },
  { key: 'referring_domains_quality', label: 'Quality Ref. Domains (DR30+, dofollow)' },
  { key: 'avg_keywords_per_page', label: 'Avg. Keywords per Ranking Page' },
  { key: 'indexed_content_pages', label: 'Live Indexed Content Pages' },
]

export function ScorecardTable({ snapshot, target }: { snapshot: MetricSnapshot | null; target: QuarterTarget }) {
  return (
    <div className="overflow-hidden rounded-md border bg-white">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
          <tr>
            <th className="px-4 py-2">Critical Statistic</th>
            <th className="px-4 py-2">Target</th>
            <th className="px-4 py-2">Actual</th>
            <th className="px-4 py-2">Variance</th>
            <th className="px-4 py-2">RAG</th>
            <th className="px-4 py-2">Accountable Owner</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {ROWS.map((row) => {
            const actual = snapshot?.[row.key] ?? null
            const targetValue = target[row.key]
            const status = calculateRAG(actual, targetValue)
            const variance = actual !== null ? actual - targetValue : null
            const variancePct = actual !== null ? ((actual - targetValue) / targetValue) * 100 : null
            const owners = ACCOUNTABILITY_MAP[row.key] ?? []

            return (
              <tr key={row.key}>
                <td className="px-4 py-2 text-slate-900">{row.label}</td>
                <td className="px-4 py-2 text-slate-600">{targetValue.toLocaleString()}</td>
                <td className="px-4 py-2 text-slate-600">{actual !== null ? actual.toLocaleString() : '—'}</td>
                <td className="px-4 py-2 text-slate-600">
                  {variance !== null ? `${variance >= 0 ? '+' : ''}${variance.toLocaleString()} (${variancePct!.toFixed(1)}%)` : '—'}
                </td>
                <td className="px-4 py-2"><RagBadge status={status} /></td>
                <td className="px-4 py-2 text-slate-600">{owners.join(', ') || '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 3: Write `app/(dashboard)/scorecard/page.tsx`**

```tsx
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getAllSnapshots } from '@/lib/metrics'
import { QUARTERLY_TARGETS } from '@/lib/constants'
import { ScorecardTable } from '@/components/scorecard/scorecard-table'
import { QuarterSelector } from '@/components/scorecard/quarter-selector'

export default async function ScorecardPage({
  searchParams,
}: {
  searchParams: Promise<{ quarter?: string }>
}) {
  const { quarter } = await searchParams
  const supabase = await createServerSupabaseClient()
  const snapshots = await getAllSnapshots(supabase)

  const selected = (quarter && quarter in QUARTERLY_TARGETS ? quarter : 'baseline') as keyof typeof QUARTERLY_TARGETS
  const snapshot = snapshots.find((s) => s.quarter_label === (selected === 'baseline' ? 'Baseline' : selected)) ?? null
  const target = QUARTERLY_TARGETS[selected]

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Quarterly Scorecard</h1>
        <QuarterSelector current={selected} />
      </div>
      <ScorecardTable snapshot={snapshot} target={target} />
    </div>
  )
}
```

- [ ] **Step 4: Verify build**

Run: `pnpm build`
Expected: succeeds.

- [ ] **Step 5: Commit**

```bash
git add "app/(dashboard)/scorecard" components/scorecard
git commit -m "feat: add quarterly scorecard with RAG and accountable owners"
```

---

## Task 15: Competitors page (table + admin CRUD)

**Files:**
- Create: `app/(dashboard)/competitors/page.tsx`
- Create: `app/api/competitors/route.ts`
- Create: `app/api/competitors/[id]/route.ts`
- Create: `components/competitors/competitor-table.tsx`
- Create: `components/competitors/add-competitor-dialog.tsx`

**Interfaces:**
- Consumes: `getCurrentProfile`, `createAdminSupabaseClient`, `Competitor` type.
- Produces: `/competitors` table (all roles read), `POST /api/competitors` and `DELETE /api/competitors/[id]` (admin only).

- [ ] **Step 1: Write `app/api/competitors/route.ts`**

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
  if (!body.company_name || !body.domain) {
    return NextResponse.json({ error: 'company_name and domain are required' }, { status: 400 })
  }
  const admin = createAdminSupabaseClient()
  const { data, error } = await admin
    .from('competitors')
    .insert({ company_name: body.company_name, domain: body.domain })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ competitor: data })
}
```

- [ ] **Step 2: Write `app/api/competitors/[id]/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/auth'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const profile = await getCurrentProfile()
  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const admin = createAdminSupabaseClient()
  const { error } = await admin.from('competitors').update({ is_active: false }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 3: Write `components/competitors/add-competitor-dialog.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog'

export function AddCompetitorDialog() {
  const [open, setOpen] = useState(false)
  const [companyName, setCompanyName] = useState('')
  const [domain, setDomain] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()

  async function handleSubmit() {
    setSubmitting(true)
    try {
      const res = await fetch('/api/competitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_name: companyName, domain }),
      })
      if (res.ok) {
        setOpen(false)
        setCompanyName('')
        setDomain('')
        router.refresh()
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button>Add competitor</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Add competitor</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Company name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
          <Input placeholder="Domain (e.g. example.com)" value={domain} onChange={(e) => setDomain(e.target.value)} />
        </div>
        <DialogFooter>
          <Button disabled={submitting || !companyName || !domain} onClick={handleSubmit}>
            {submitting ? 'Adding…' : 'Add'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 4: Write `components/competitors/competitor-table.tsx`**

```tsx
'use client'

import { useRouter } from 'next/navigation'
import type { Competitor } from '@/types'
import { Button } from '@/components/ui/button'

export function CompetitorTable({ competitors, isAdmin }: { competitors: Competitor[]; isAdmin: boolean }) {
  const router = useRouter()

  return (
    <div className="overflow-x-auto rounded-md border bg-white">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
          <tr>
            <th className="px-4 py-2">Company</th>
            <th className="px-4 py-2">Domain</th>
            <th className="px-4 py-2">DR</th>
            <th className="px-4 py-2">Traffic/mo</th>
            <th className="px-4 py-2">Keywords</th>
            <th className="px-4 py-2">#1–3 Keywords</th>
            <th className="px-4 py-2">Est. Value</th>
            <th className="px-4 py-2">Ref. Domains</th>
            <th className="px-4 py-2">Last Synced</th>
            {isAdmin && <th className="px-4 py-2" />}
          </tr>
        </thead>
        <tbody className="divide-y">
          {competitors.map((c) => (
            <tr key={c.id}>
              <td className="px-4 py-2 font-medium text-slate-900">{c.company_name}</td>
              <td className="px-4 py-2 text-slate-600">{c.domain}</td>
              <td className="px-4 py-2 text-slate-600">{c.domain_rating ?? '—'}</td>
              <td className="px-4 py-2 text-slate-600">{c.organic_traffic ?? '—'}</td>
              <td className="px-4 py-2 text-slate-600">{c.organic_keywords ?? '—'}</td>
              <td className="px-4 py-2 text-slate-600">{c.keywords_top_3 ?? '—'}</td>
              <td className="px-4 py-2 text-slate-600">{c.est_traffic_value ? `$${c.est_traffic_value.toLocaleString()}` : '—'}</td>
              <td className="px-4 py-2 text-slate-600">{c.referring_domains ?? '—'}</td>
              <td className="px-4 py-2 text-slate-600">{c.last_synced_at ? new Date(c.last_synced_at).toLocaleDateString() : 'never'}</td>
              {isAdmin && (
                <td className="px-4 py-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      await fetch(`/api/competitors/${c.id}`, { method: 'DELETE' })
                      router.refresh()
                    }}
                  >
                    Remove
                  </Button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 5: Write `app/(dashboard)/competitors/page.tsx`**

```tsx
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/auth'
import { CompetitorTable } from '@/components/competitors/competitor-table'
import { AddCompetitorDialog } from '@/components/competitors/add-competitor-dialog'
import type { Competitor } from '@/types'

export default async function CompetitorsPage() {
  const profile = await getCurrentProfile()
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase.from('competitors').select('*').eq('is_active', true).order('domain_rating', { ascending: false, nullsFirst: false })

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Competitor Tracker</h1>
        {profile?.role === 'admin' && <AddCompetitorDialog />}
      </div>
      <CompetitorTable competitors={(data as Competitor[]) ?? []} isAdmin={profile?.role === 'admin'} />
    </div>
  )
}
```

- [ ] **Step 6: Verify build**

Run: `pnpm build`
Expected: succeeds.

- [ ] **Step 7: Commit**

```bash
git add "app/(dashboard)/competitors" app/api/competitors components/competitors
git commit -m "feat: add competitor tracker table with admin add/remove"
```

---

## Task 16: Keywords page (table + CSV import)

**Files:**
- Create: `app/(dashboard)/keywords/page.tsx`
- Create: `app/api/keywords/import/route.ts`
- Create: `components/keywords/keyword-table.tsx`
- Create: `components/keywords/csv-import-dialog.tsx`

**Interfaces:**
- Consumes: `getCurrentProfile`, `createAdminSupabaseClient`, `papaparse`, `TrackedKeyword` type.
- Produces: `/keywords` table with category filter and `POST /api/keywords/import` (admin/head only) accepting `{rows: {keyword, volume, kd, cpc, category, priority, target_url}[]}` parsed client-side from CSV via PapaParse.

- [ ] **Step 1: Write `app/api/keywords/import/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/auth'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'

interface ImportRow {
  keyword: string
  volume?: string
  kd?: string
  cpc?: string
  category?: string
  priority?: string
  target_url?: string
}

export async function POST(request: Request) {
  const profile = await getCurrentProfile()
  if (!profile || !['admin', 'head'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { rows }: { rows: ImportRow[] } = await request.json()
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'No rows to import' }, { status: 400 })
  }

  const admin = createAdminSupabaseClient()
  const payload = rows
    .filter((r) => r.keyword?.trim())
    .map((r) => ({
      keyword: r.keyword.trim(),
      monthly_volume: r.volume ? Number(r.volume) : null,
      keyword_difficulty: r.kd ? Number(r.kd) : null,
      cpc: r.cpc ? Number(r.cpc) : null,
      category: r.category || null,
      priority: r.priority || null,
      target_url: r.target_url || null,
    }))

  const { data, error } = await admin.from('tracked_keywords').insert(payload).select()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ imported: data.length })
}
```

- [ ] **Step 2: Write `components/keywords/csv-import-dialog.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Papa from 'papaparse'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'

export function CsvImportDialog() {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const router = useRouter()

  async function handleImport() {
    if (!file) return
    setImporting(true)
    try {
      const text = await file.text()
      const parsed = Papa.parse(text, { header: true, skipEmptyLines: true })
      const res = await fetch('/api/keywords/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: parsed.data }),
      })
      if (res.ok) {
        setOpen(false)
        setFile(null)
        router.refresh()
      }
    } finally {
      setImporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="outline">Import CSV</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Import keywords from CSV</DialogTitle></DialogHeader>
        <p className="text-sm text-slate-500">
          Columns: keyword, volume, kd, cpc, category, priority, target_url
        </p>
        <input type="file" accept=".csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <DialogFooter>
          <Button disabled={!file || importing} onClick={handleImport}>
            {importing ? 'Importing…' : 'Import'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 3: Write `components/keywords/keyword-table.tsx`**

```tsx
import type { TrackedKeyword } from '@/types'

export function KeywordTable({ keywords }: { keywords: TrackedKeyword[] }) {
  return (
    <div className="overflow-x-auto rounded-md border bg-white">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
          <tr>
            <th className="px-4 py-2">Keyword</th>
            <th className="px-4 py-2">Volume</th>
            <th className="px-4 py-2">KD</th>
            <th className="px-4 py-2">Position</th>
            <th className="px-4 py-2">Change</th>
            <th className="px-4 py-2">Target URL</th>
            <th className="px-4 py-2">Category</th>
            <th className="px-4 py-2">Priority</th>
            <th className="px-4 py-2">CPC</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {keywords.map((k) => {
            const change = k.current_position != null && k.previous_position != null
              ? k.previous_position - k.current_position
              : null
            return (
              <tr key={k.id}>
                <td className="px-4 py-2 font-medium text-slate-900">{k.keyword}</td>
                <td className="px-4 py-2 text-slate-600">{k.monthly_volume ?? '—'}</td>
                <td className="px-4 py-2 text-slate-600">{k.keyword_difficulty ?? '—'}</td>
                <td className="px-4 py-2 text-slate-600">{k.current_position ?? '—'}</td>
                <td className={`px-4 py-2 ${change && change > 0 ? 'text-green-600' : change && change < 0 ? 'text-red-600' : 'text-slate-600'}`}>
                  {change === null ? '—' : change === 0 ? '—' : change > 0 ? `▲${change}` : `▼${Math.abs(change)}`}
                </td>
                <td className="px-4 py-2 text-slate-600">{k.target_url ?? '—'}</td>
                <td className="px-4 py-2 text-slate-600">{k.category ?? '—'}</td>
                <td className="px-4 py-2 text-slate-600">{k.priority ?? '—'}</td>
                <td className="px-4 py-2 text-slate-600">{k.cpc ? `$${k.cpc}` : '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 4: Write `app/(dashboard)/keywords/page.tsx`**

```tsx
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/auth'
import { KeywordTable } from '@/components/keywords/keyword-table'
import { CsvImportDialog } from '@/components/keywords/csv-import-dialog'
import type { TrackedKeyword } from '@/types'

export default async function KeywordsPage() {
  const profile = await getCurrentProfile()
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase.from('tracked_keywords').select('*').eq('is_active', true).order('keyword')

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Keyword Rank Tracker</h1>
        {profile && ['admin', 'head'].includes(profile.role) && <CsvImportDialog />}
      </div>
      <KeywordTable keywords={(data as TrackedKeyword[]) ?? []} />
    </div>
  )
}
```

- [ ] **Step 5: Verify build**

Run: `pnpm build`
Expected: succeeds.

- [ ] **Step 6: Commit**

```bash
git add "app/(dashboard)/keywords" app/api/keywords components/keywords
git commit -m "feat: add keyword rank tracker with CSV import"
```

---

## Task 17: Audit reports page

**Files:**
- Create: `app/(dashboard)/audit/page.tsx`
- Create: `app/api/audit/route.ts`
- Create: `components/audit/audit-card.tsx`
- Create: `components/audit/new-finding-dialog.tsx`
- Create: `components/audit/audit-filters.tsx`

**Interfaces:**
- Consumes: `getCurrentProfile`, `createAdminSupabaseClient`, `AuditReport` type.
- Produces: `/audit` with category/severity/status/owner filters and `POST /api/audit` (admin/head only) for new findings.

- [ ] **Step 1: Write `app/api/audit/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/auth'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  const profile = await getCurrentProfile()
  if (!profile || !['admin', 'head'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const body = await request.json()
  if (!body.title || !body.finding) {
    return NextResponse.json({ error: 'title and finding are required' }, { status: 400 })
  }
  const admin = createAdminSupabaseClient()
  const { data, error } = await admin
    .from('audit_reports')
    .insert({
      title: body.title,
      category: body.category ?? null,
      severity: body.severity ?? null,
      finding: body.finding,
      recommendation: body.recommendation ?? null,
      assigned_to: body.assigned_to ?? null,
    })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ finding: data })
}
```

- [ ] **Step 2: Write `components/audit/audit-card.tsx`**

```tsx
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { AuditReport } from '@/types'

const SEVERITY_STYLES: Record<string, string> = {
  critical: 'bg-red-100 text-red-800',
  high: 'bg-orange-100 text-orange-800',
  medium: 'bg-amber-100 text-amber-800',
  low: 'bg-slate-100 text-slate-700',
}

export function AuditCard({ report }: { report: AuditReport }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-base">{report.title}</CardTitle>
          <p className="text-xs text-slate-500">{report.category} · assigned to {report.assigned_profile?.full_name ?? 'unassigned'}</p>
        </div>
        <div className="flex gap-2">
          {report.severity && <Badge className={SEVERITY_STYLES[report.severity]}>{report.severity}</Badge>}
          <Badge variant="outline">{report.status.replace('_', ' ')}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-1 text-sm">
        <p className="text-slate-700">{report.finding}</p>
        {report.recommendation && <p className="text-slate-500">Recommendation: {report.recommendation}</p>}
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 3: Write `components/audit/audit-filters.tsx`**

```tsx
'use client'

import { useRouter, useSearchParams } from 'next/navigation'

export function AuditFilters() {
  const router = useRouter()
  const params = useSearchParams()

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString())
    if (value) next.set(key, value)
    else next.delete(key)
    router.push(`/audit?${next.toString()}`)
  }

  return (
    <div className="mb-4 flex gap-2">
      <select className="rounded border px-2 py-1 text-sm" defaultValue={params.get('category') ?? ''} onChange={(e) => setParam('category', e.target.value)}>
        <option value="">All categories</option>
        {['technical', 'backlink', 'content', 'on-page', 'architecture'].map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <select className="rounded border px-2 py-1 text-sm" defaultValue={params.get('severity') ?? ''} onChange={(e) => setParam('severity', e.target.value)}>
        <option value="">All severities</option>
        {['critical', 'high', 'medium', 'low'].map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
      <select className="rounded border px-2 py-1 text-sm" defaultValue={params.get('status') ?? ''} onChange={(e) => setParam('status', e.target.value)}>
        <option value="">All statuses</option>
        {['open', 'in_progress', 'resolved', 'wont_fix'].map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
      </select>
    </div>
  )
}
```

- [ ] **Step 4: Write `components/audit/new-finding-dialog.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'

export function NewFindingDialog() {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [finding, setFinding] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()

  async function handleSubmit() {
    setSubmitting(true)
    try {
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, finding }),
      })
      if (res.ok) {
        setOpen(false)
        setTitle('')
        setFinding('')
        router.refresh()
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button>New finding</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New audit finding</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea placeholder="Finding details" value={finding} onChange={(e) => setFinding(e.target.value)} />
        </div>
        <DialogFooter>
          <Button disabled={submitting || !title || !finding} onClick={handleSubmit}>
            {submitting ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 5: Write `app/(dashboard)/audit/page.tsx`**

```tsx
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/auth'
import { AuditCard } from '@/components/audit/audit-card'
import { AuditFilters } from '@/components/audit/audit-filters'
import { NewFindingDialog } from '@/components/audit/new-finding-dialog'
import type { AuditReport } from '@/types'

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const profile = await getCurrentProfile()
  const params = await searchParams
  const supabase = await createServerSupabaseClient()

  let query = supabase
    .from('audit_reports')
    .select('*, assigned_profile:assigned_to(id, full_name)')
    .order('severity', { ascending: true })

  if (params.category) query = query.eq('category', params.category)
  if (params.severity) query = query.eq('severity', params.severity)
  if (params.status) query = query.eq('status', params.status)

  const { data } = await query

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Audit Reports</h1>
        {profile && ['admin', 'head'].includes(profile.role) && <NewFindingDialog />}
      </div>
      <AuditFilters />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {((data as AuditReport[]) ?? []).map((report) => <AuditCard key={report.id} report={report} />)}
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Verify build**

Run: `pnpm build`
Expected: succeeds.

- [ ] **Step 7: Commit**

```bash
git add "app/(dashboard)/audit" app/api/audit components/audit
git commit -m "feat: add audit reports page with filters and new-finding form"
```

---

## Task 18: Admin panel — users, sync, manual metrics

**Files:**
- Create: `app/(dashboard)/admin/page.tsx`
- Create: `app/(dashboard)/admin/users/page.tsx`
- Create: `app/(dashboard)/admin/metrics/page.tsx`
- Create: `app/api/admin/users/route.ts`
- Create: `app/api/admin/metrics/route.ts`
- Create: `components/admin/create-user-form.tsx`
- Create: `components/admin/manual-metric-form.tsx`

**Interfaces:**
- Consumes: `getCurrentProfile`, `createAdminSupabaseClient`, `TEAM_MEMBERS`/`MetricKey` types.
- Produces: `/admin` hub, `/admin/users` (create/deactivate, role select — enforces only one `admin` may exist per Section 12.10), `/admin/metrics` (manual quarterly snapshot entry, including `referring_domains_quality`). `middleware.ts` (Task 7) already blocks non-admins from `/admin/*`; these routes additionally re-check server-side since Route Handlers aren't covered by that middleware check on their own without profile lookup here.

- [ ] **Step 1: Write `app/api/admin/users/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/auth'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import type { Role } from '@/types'

export async function POST(request: Request) {
  const profile = await getCurrentProfile()
  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { full_name, email, role, job_title } = body as {
    full_name: string; email: string; role: Role; job_title?: string
  }
  if (!full_name || !email || !role) {
    return NextResponse.json({ error: 'full_name, email, and role are required' }, { status: 400 })
  }

  const admin = createAdminSupabaseClient()

  if (role === 'admin') {
    const { count } = await admin.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'admin')
    if ((count ?? 0) > 0) {
      return NextResponse.json({ error: 'Only one admin user is allowed (CLAUDE.md Section 12.10)' }, { status: 409 })
    }
  }

  const tempPassword = crypto.randomUUID()
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email, password: tempPassword, email_confirm: true,
  })
  if (createError) return NextResponse.json({ error: createError.message }, { status: 500 })

  const { data: newProfile, error: profileError } = await admin
    .from('profiles')
    .insert({ id: created.user.id, full_name, role, job_title: job_title ?? null })
    .select()
    .single()
  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 })

  return NextResponse.json({ profile: newProfile, tempPassword })
}

export async function PATCH(request: Request) {
  const profile = await getCurrentProfile()
  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { id, is_active } = await request.json()
  const admin = createAdminSupabaseClient()
  const { error } = await admin.from('profiles').update({ is_active }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Write `app/api/admin/metrics/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/auth'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import type { MetricKey } from '@/types'

const METRIC_KEYS: MetricKey[] = [
  'domain_rating', 'organic_traffic_global', 'organic_traffic_us',
  'organic_keywords_global', 'organic_keywords_us', 'keywords_top_3',
  'keywords_top_10', 'traffic_value_monthly', 'referring_domains_total',
  'referring_domains_quality', 'avg_keywords_per_page', 'indexed_content_pages',
]

export async function POST(request: Request) {
  const profile = await getCurrentProfile()
  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  if (!body.snapshot_date || !body.quarter_label) {
    return NextResponse.json({ error: 'snapshot_date and quarter_label are required' }, { status: 400 })
  }

  const payload: Record<string, unknown> = {
    snapshot_date: body.snapshot_date,
    quarter_label: body.quarter_label,
    notes: body.notes ?? null,
    created_by: profile.id,
  }
  for (const key of METRIC_KEYS) {
    payload[key] = body[key] !== undefined && body[key] !== '' ? Number(body[key]) : null
  }

  const admin = createAdminSupabaseClient()
  const { data, error } = await admin.from('metric_snapshots').insert(payload).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ snapshot: data })
}
```

- [ ] **Step 3: Write `components/admin/create-user-form.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Role } from '@/types'

const ROLES: Role[] = ['admin', 'head', 'owner', 'leadership']

export function CreateUserForm() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Role>('owner')
  const [jobTitle, setJobTitle] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()

  async function handleSubmit() {
    setSubmitting(true)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: fullName, email, role, job_title: jobTitle }),
      })
      const body = await res.json()
      if (!res.ok) {
        setMessage(body.error)
        return
      }
      setMessage(`Created ${email} — temp password: ${body.tempPassword}`)
      setFullName(''); setEmail(''); setJobTitle('')
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-md space-y-3 rounded-md border bg-white p-4">
      <h2 className="font-medium text-slate-900">Create user</h2>
      <Input placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
      <Input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <Input placeholder="Job title" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
      <select className="w-full rounded border px-3 py-2 text-sm" value={role} onChange={(e) => setRole(e.target.value as Role)}>
        {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
      </select>
      {message && <p className="text-sm text-slate-600">{message}</p>}
      <Button disabled={submitting || !fullName || !email} onClick={handleSubmit}>
        {submitting ? 'Creating…' : 'Create user'}
      </Button>
    </div>
  )
}
```

- [ ] **Step 4: Write `components/admin/manual-metric-form.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { MetricKey } from '@/types'

const FIELDS: { key: MetricKey; label: string }[] = [
  { key: 'domain_rating', label: 'Domain Rating' },
  { key: 'organic_traffic_global', label: 'Organic Traffic (Global)' },
  { key: 'organic_traffic_us', label: 'Organic Traffic (US)' },
  { key: 'organic_keywords_global', label: 'Organic Keywords (Global)' },
  { key: 'organic_keywords_us', label: 'Organic Keywords (US)' },
  { key: 'keywords_top_3', label: 'Keywords #1–3' },
  { key: 'keywords_top_10', label: 'Keywords Top 10' },
  { key: 'traffic_value_monthly', label: 'Traffic Value / mo' },
  { key: 'referring_domains_total', label: 'Referring Domains (Total)' },
  { key: 'referring_domains_quality', label: 'Quality Ref. Domains (manual census)' },
  { key: 'avg_keywords_per_page', label: 'Avg Keywords / Page' },
  { key: 'indexed_content_pages', label: 'Indexed Content Pages' },
]

export function ManualMetricForm() {
  const [snapshotDate, setSnapshotDate] = useState('')
  const [quarterLabel, setQuarterLabel] = useState('')
  const [values, setValues] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit() {
    setSubmitting(true)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshot_date: snapshotDate, quarter_label: quarterLabel, ...values }),
      })
      const body = await res.json()
      if (!res.ok) {
        setMessage(body.error)
        return
      }
      setMessage('Snapshot saved.')
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-lg space-y-3 rounded-md border bg-white p-4">
      <h2 className="font-medium text-slate-900">Enter manual quarterly snapshot</h2>
      <Input type="date" value={snapshotDate} onChange={(e) => setSnapshotDate(e.target.value)} />
      <Input placeholder="Quarter label (e.g. Q1)" value={quarterLabel} onChange={(e) => setQuarterLabel(e.target.value)} />
      <div className="grid grid-cols-2 gap-3">
        {FIELDS.map((field) => (
          <div key={field.key}>
            <label className="mb-1 block text-xs text-slate-500">{field.label}</label>
            <Input
              type="number"
              value={values[field.key] ?? ''}
              onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
            />
          </div>
        ))}
      </div>
      {message && <p className="text-sm text-slate-600">{message}</p>}
      <Button disabled={submitting || !snapshotDate || !quarterLabel} onClick={handleSubmit}>
        {submitting ? 'Saving…' : 'Save snapshot'}
      </Button>
    </div>
  )
}
```

- [ ] **Step 5: Write `app/(dashboard)/admin/page.tsx`**

```tsx
import Link from 'next/link'

export default function AdminHubPage() {
  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-slate-900">Admin</h1>
      <div className="flex gap-4">
        <Link href="/admin/users" className="rounded-md border bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
          Users
        </Link>
        <Link href="/admin/metrics" className="rounded-md border bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
          Manual metric entry
        </Link>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Write `app/(dashboard)/admin/users/page.tsx`**

```tsx
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { CreateUserForm } from '@/components/admin/create-user-form'
import type { Profile } from '@/types'

export default async function AdminUsersPage() {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase.from('profiles').select('*').order('full_name')

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Users</h1>
      <CreateUserForm />
      <div className="overflow-hidden rounded-md border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
            <tr><th className="px-4 py-2">Name</th><th className="px-4 py-2">Role</th><th className="px-4 py-2">Job title</th><th className="px-4 py-2">Active</th></tr>
          </thead>
          <tbody className="divide-y">
            {((data as Profile[]) ?? []).map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-2 text-slate-900">{p.full_name}</td>
                <td className="px-4 py-2 text-slate-600">{p.role}</td>
                <td className="px-4 py-2 text-slate-600">{p.job_title ?? '—'}</td>
                <td className="px-4 py-2 text-slate-600">{p.is_active ? 'Yes' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Write `app/(dashboard)/admin/metrics/page.tsx`**

```tsx
import { ManualMetricForm } from '@/components/admin/manual-metric-form'

export default function AdminMetricsPage() {
  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-slate-900">Manual Metric Entry</h1>
      <ManualMetricForm />
    </div>
  )
}
```

- [ ] **Step 8: Verify build**

Run: `pnpm build`
Expected: succeeds.

- [ ] **Step 9: Commit**

```bash
git add "app/(dashboard)/admin" app/api/admin components/admin
git commit -m "feat: add admin panel with user creation and manual metric entry"
```

---

## Task 19: End-to-end manual verification pass

**Files:** none created — this task exercises the whole app.

**Interfaces:** none — verification only.

- [ ] **Step 1: Run full test suite**

Run: `pnpm test`
Expected: all unit tests pass (constants, RAG, Ahrefs stub).

- [ ] **Step 2: Run production build**

Run: `pnpm build`
Expected: no TypeScript or build errors across all routes.

- [ ] **Step 3: Manual smoke test against a real Supabase project**

Document in `README.md` under a "Verification checklist" section (create it) the exact steps a developer follows once `.env.local` is filled in:
```markdown
## Verification checklist (v1 Definition of Done)
1. `pnpm seed:users` then run `supabase/seed.sql` — confirm all 9 team members' rows exist in `profiles`.
2. Log in as each of the 9 users — confirm each reaches `/dashboard` and the sidebar reflects their role (only Abdullah sees "Admin").
3. Visit `/tasks` — confirm all 34 actions are listed with correct owners/due dates; confirm an `owner` can change status only on their own tasks (try as Talha Azeem vs. as Usman Ali).
4. Visit `/scorecard?quarter=baseline` — confirm all 12 rows show the baseline actual vs. target with correct RAG colors.
5. As Abdullah, click "Sync Ahrefs data" on `/dashboard` — confirm a new `metric_snapshots` row appears and stat tiles update, and confirm `referring_domains_quality` is untouched by the sync.
6. Visit `/audit` — confirm all 17 seeded findings appear and filters work.
7. As Abdullah, visit `/admin/users` and create a test user; visit `/admin/metrics` and submit a manual snapshot.
8. Visit `/competitors`, add a competitor as Abdullah, confirm it appears; confirm a non-admin cannot see the "Add competitor" button.
9. Visit `/keywords`, import a small CSV, confirm rows appear.
```

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: add v1 verification checklist"
```

---

## Self-Review Notes

- **Spec coverage:** Sections 2–7 (stack, architecture, roles, schema, env, Ahrefs client) → Tasks 1–10. Section 8.1 (login) → Task 7. Section 8.2 (dashboard, minus charts per Section 13) → Tasks 9–11. Section 8.3 (tasks, list view only per Section 13 v1 scope — Kanban/detail-panel/activity-log deferred) → Task 13. Section 8.4 (scorecard) → Task 14. Section 8.5 (competitors) → Task 15. Section 8.6 (keywords, CSV import) → Task 16. Section 8.7 (audit) → Task 17. Section 8.9 (admin: users, metrics) → Task 18. Section 9 (RAG, quarter detection) → Tasks 5–6. Section 10 (seed data) → Task 12. Out of v1 per Section 13: 8.8 weekly report, 7.3 GA4, 7.4 Clarity, charts/sparklines, `/admin/sync` UI (the sync route itself exists per Definition of Done "syncs manually via admin trigger"; a dedicated sync-log viewer page is v2 polish).
- **Ambiguity resolved:** Section 4's RLS note ("owner can only UPDATE tasks where assigned_to = auth.uid()") is read to include `co_assigned_to` as well, since Section 8.3's permissions table explicitly lists "tasks where they are assigned_to or co_assigned_to" — Task 3's RLS policy and Task 13's route handler both implement the broader (spec-explicit) rule.
- **Type consistency:** `TaskStatus`, `MetricKey`, `Role`, `AuditStatus`/`AuditSeverity`/`AuditCategory` defined once in `types/index.ts` (Task 2) and referenced by name in every later task — no redeclaration.
