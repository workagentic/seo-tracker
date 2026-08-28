# EA SEO Tracker — Internal Tool
## Claude Code Project Specification

---

## 1. Project Overview

**What this is:** An internal SEO tracking and accountability dashboard for the Expertise Accelerated (EA) SEO team. It consolidates data from Ahrefs, Google Search Console (GSC), Google Analytics 4 (GA4), and Microsoft Clarity into one place, and adds a task tracker tied to named team members so the quarterly SEO programme can be managed and measured without switching between tools.

**Who it's for:** 9 internal team members across SEO, content, technical, PR, design, and analytics roles. Not a SaaS — no external clients, no billing, no public registration.

**The problem it solves:** The team runs a quarterly SEO programme with 34 tracked actions, 12 KPI metrics, and a named accountability map (each metric maps to a specific person). Today all of this lives in a Word document and spreadsheet that gets re-pulled manually every quarter. This tool automates the data layer, surfaces the right metrics to the right people, and makes task ownership visible in real time.

**Core document it implements:** `EA_SEO_Strategy_Report_FinalOpus_08232026.docx` — specifically Section 11 (Action Plan & Quarterly Progress Tracker), Section 8.3 (Measurement), Section 9 (Team Structure), and the accountability map in Section 11.3.

---

## 2. Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | Next.js 14 (App Router, TypeScript) | Full-stack, one repo, server components for data fetching |
| Database | Supabase (PostgreSQL) | Auth built-in, real-time, fast to set up |
| Auth | Supabase Auth | Row-level security per user, email+password |
| UI Components | shadcn/ui + Tailwind CSS | Consistent design system, easy to customise |
| Charts | Recharts | Works well with React, clean defaults |
| Data fetching | TanStack Query (React Query) | Caching, background refetch for API data |
| API integrations | Ahrefs API v3, Google Analytics Data API v1, Google Search Console API v1, Microsoft Clarity API | See Section 7 |
| Hosting | Vercel (recommended) | Native Next.js support, zero config |
| Package manager | pnpm | Faster installs |

**Node version:** 20+
**TypeScript:** strict mode on

---

## 3. Architecture

```
ea-seo-tracker/
├── app/                        # Next.js App Router
│   ├── (auth)/
│   │   └── login/              # Login page
│   ├── (dashboard)/
│   │   ├── layout.tsx          # Sidebar + nav shell
│   │   ├── page.tsx            # /  → redirects to /dashboard
│   │   ├── dashboard/          # Main KPI dashboard
│   │   ├── tasks/              # Task tracker (Section 11.1)
│   │   ├── scorecard/          # Quarterly scorecard (Section 11.4)
│   │   ├── competitors/        # Competitor comparison (Section 2)
│   │   ├── keywords/           # Rank tracker
│   │   ├── audit/              # SEO audit reports
│   │   ├── weekly-report/      # Weekly snapshot (for Talha, Syed Ali)
│   │   └── admin/              # Admin panel (Abdullah only)
│   └── api/
│       ├── ahrefs/             # Ahrefs proxy routes
│       ├── gsc/                # GSC proxy routes
│       ├── ga4/                # GA4 proxy routes
│       ├── clarity/            # Clarity proxy routes
│       ├── tasks/              # Task CRUD
│       ├── metrics/            # Metrics snapshots
│       └── sync/               # Manual sync triggers
├── components/
│   ├── ui/                     # shadcn/ui base components
│   ├── dashboard/              # Dashboard-specific components
│   ├── tasks/                  # Task tracker components
│   ├── scorecard/              # Scorecard components
│   ├── charts/                 # Recharts wrappers
│   └── layout/                 # Sidebar, topbar, nav
├── lib/
│   ├── supabase/               # Supabase client (server + client)
│   ├── ahrefs/                 # Ahrefs API client
│   ├── gsc/                    # GSC API client
│   ├── ga4/                    # GA4 API client
│   ├── clarity/                # Clarity API client
│   ├── rag.ts                  # RAG status calculation logic
│   ├── metrics.ts              # Metric target definitions
│   └── constants.ts            # Team members, actions, targets
├── types/
│   └── index.ts                # All TypeScript types
├── middleware.ts               # Auth protection for all routes
├── .env.local                  # Environment variables (see Section 6)
└── supabase/
    ├── migrations/             # SQL migration files
    └── seed.sql                # Initial seed data
```

---

## 4. User Roles & Permissions

There are four roles. Store role in the `profiles` table.

| Role | Who | What they can see |
|---|---|---|
| `admin` | Abdullah Shekha, Syed Ali, Haroon (updated 28 Aug 2026 — see Section 12.10) | Everything. Can manage users, competitors, keywords, metric snapshots, all tasks |
| `head` | *(vacant as of 28 Aug 2026 — Tabish moved to `owner`, see Section 12.10)* | Everything except user management. Can edit all tasks, run quarterly review |
| `owner` | Tabish Khalid, and all other named team members not listed above | Their own tasks + dashboard + scorecard (read-only on others' tasks) |
| `leadership` | Adeela | Full read access everywhere. Cannot edit tasks or data |

**Route protection:** `middleware.ts` checks Supabase session on every request. Unauthenticated users are redirected to `/login`. Admin-only routes (`/admin/*`) check role server-side.

**Row-level security (Supabase):** Enable RLS on all tables. `owner` role users can only `UPDATE` rows in `tasks` where `assigned_to = auth.uid()`. All roles can `SELECT` all tasks (team visibility is important for coordination).

---

## 5. Database Schema

Run all of this in Supabase migrations. Use `uuid` primary keys throughout.

### 5.1 `profiles`
Extends Supabase `auth.users`.
```sql
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('admin', 'head', 'owner', 'leadership')),
  job_title text,
  section_owner text,  -- e.g. "Analytics", "Technical SEO / Content Strategist"
  avatar_url text,
  created_at timestamptz default now()
);
```

### 5.2 `tasks`
The 34-action register from Section 11.1. Pre-seeded but editable.
```sql
create table tasks (
  id uuid primary key default gen_random_uuid(),
  action_number text not null,          -- e.g. "A1", "A5"
  title text not null,
  description text,
  position_responsible text,            -- human-readable, e.g. "Abdullah Shekha"
  assigned_to uuid references profiles(id),
  co_assigned_to uuid references profiles(id),
  due_date date,
  status text not null default 'pending'
    check (status in ('pending', 'in_progress', 'completed', 'blocked', 'overdue')),
  quarter text,                         -- e.g. "Q1", "Q2"
  notes text,
  completed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  updated_by uuid references profiles(id)  -- added 0005_task_updated_by.sql, backs the
                                            -- notification bell's "changed by someone else"
);
```

### 5.3 `metric_snapshots`
One row per quarterly pull. Baseline and all future quarter-end readings go here.
```sql
create table metric_snapshots (
  id uuid primary key default gen_random_uuid(),
  snapshot_date date not null,
  quarter_label text,                   -- e.g. "Baseline", "Q1", "Q2"
  domain_rating integer,
  organic_traffic_global integer,
  organic_traffic_us integer,
  organic_keywords_global integer,
  organic_keywords_us integer,
  keywords_top_3 integer,
  keywords_top_10 integer,
  traffic_value_monthly numeric,
  referring_domains_total integer,
  referring_domains_quality integer,    -- DR30+, dofollow
  avg_keywords_per_page numeric,
  indexed_content_pages integer,
  notes text,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);
```

### 5.4 `competitors`
Configurable list — Tabish/Talha will provide the updated list.
```sql
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
```

### 5.5 `tracked_keywords`
Keywords under active monitoring. Admin/head can add/remove.
```sql
create table tracked_keywords (
  id uuid primary key default gen_random_uuid(),
  keyword text not null,
  priority text check (priority in ('high', 'medium', 'low')),
  category text,                        -- e.g. "striking-distance", "commercial", "glossary", "niche"
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
```

### 5.6 `keyword_history`
Weekly position snapshots per keyword.
```sql
create table keyword_history (
  id uuid primary key default gen_random_uuid(),
  keyword_id uuid references tracked_keywords(id) on delete cascade,
  recorded_at date not null,
  position integer,
  url text
);
```

### 5.7 `audit_reports`
Generated audit findings.
```sql
create table audit_reports (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text,                        -- e.g. "technical", "backlink", "content", "on-page"
  severity text check (severity in ('critical', 'high', 'medium', 'low')),
  finding text not null,
  recommendation text,
  assigned_to uuid references profiles(id),
  status text default 'open'
    check (status in ('open', 'in_progress', 'resolved', 'wont_fix')),
  resolved_at timestamptz,
  created_at timestamptz default now()
);
```

### 5.8 `weekly_reports`
Auto-generated weekly summaries sent to relevant owners.
```sql
create table weekly_reports (
  id uuid primary key default gen_random_uuid(),
  week_start date not null,
  week_end date not null,
  generated_at timestamptz default now(),
  summary jsonb,                        -- structured snapshot of key metrics
  recipient_ids uuid[]
);
```

### 5.9 `app_settings`
Singleton row backing `/admin/settings` (added `0004_settings_and_sync_logs.sql`). Quarter
boundaries are deliberately **not** here — they stay in `lib/constants.ts` per Section 9.3.
```sql
create table app_settings (
  id boolean primary key default true check (id),
  target_domain text not null default 'expertiseaccelerated.com',
  gsc_site_url text,
  ga4_property_id text,
  updated_by uuid references profiles(id),
  updated_at timestamptz default now()
);
```

### 5.10 `sync_logs`
One row per sync attempt (Ahrefs main-domain sync, competitor sync, GSC sync, or the weekly
cron), written by the sync routes themselves on both success and failure. Backs `/admin/sync`.
```sql
create table sync_logs (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'ahrefs',   -- 'ahrefs' | 'competitors' | 'gsc' | 'weekly-cron'
  status text not null check (status in ('success', 'error')),
  message text,
  triggered_by uuid references profiles(id),  -- null for cron-triggered runs
  created_at timestamptz default now()
);
```

### 5.11 `competitor_snapshots`
Added `0006_competitor_snapshots.sql`. Weekly point-in-time history for competitors —
mirrors `keyword_history`'s role, since `competitors` itself only holds current-state values
with no trend over time. Written by the weekly cron (Section 8.9/8.5) and readable by
everyone, same as `competitors`.
```sql
create table competitor_snapshots (
  id uuid primary key default gen_random_uuid(),
  competitor_id uuid references competitors(id) on delete cascade,
  snapshot_date date not null,
  domain_rating integer,
  organic_traffic integer,
  organic_keywords integer,
  keywords_top_3 integer,
  est_traffic_value numeric,
  referring_domains integer,
  created_at timestamptz default now()
);
```

### 5.12 `quarterly_targets`
Added `0007_quarterly_targets.sql`. Admin-editable replacement for the `QUARTERLY_TARGETS`
constant (Section 10.3) — see Section 8.4's "Edit Targets" and Section 12 note 11.
```sql
create table quarterly_targets (
  quarter_key text primary key,  -- 'baseline' | 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'Q5'
  label text not null,
  target_date date not null,
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
  updated_by uuid references profiles(id),
  updated_at timestamptz default now()
);
```

---

## 6. Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=           # server-side only, never expose to client

# Ahrefs
AHREFS_API_KEY=                      # From Ahrefs account → API → Tokens

# Google (service account — used for both GSC and GA4, see Section 7.2/7.3)
GOOGLE_SERVICE_ACCOUNT_EMAIL=        # e.g. ea-seo-tracker-reader@<project-id>.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=  # PEM key, single-line with literal \n
GA4_PROPERTY_ID=                     # e.g. 123456789
GSC_SITE_URL=                        # e.g. https://expertiseaccelerated.com/ — local-dev reference only; the app reads app_settings.gsc_site_url

# Microsoft Clarity
CLARITY_PROJECT_ID=
CLARITY_API_TOKEN=                   # From Clarity dashboard → Settings → API

# Cron (Vercel Cron Jobs auth for /api/cron/weekly-snapshot — see Section 8.5/8.9)
CRON_SECRET=                         # Random string; Vercel sends it as `Authorization: Bearer <value>`

# App
NEXTAUTH_SECRET=                     # Random 32-char string
NEXT_PUBLIC_APP_URL=                 # e.g. https://seo.expertiseaccelerated.com
```

---

## 7. API Integrations

### 7.1 Ahrefs API v3
**Base URL:** `https://api.ahrefs.com/v3`
**Auth:** `Authorization: Bearer {AHREFS_API_KEY}`

**Implemented as of 26 Aug 2026** (`lib/ahrefs/client.ts`) — the endpoints below are the ones
actually wired up and verified against Ahrefs's own API reference, replacing an earlier draft
of this table that named endpoints (`/backlinks`, `/positions`, `/referring-domains`,
`/metrics-history`) that either don't exist or aren't what's used:

| Data needed | Endpoint | Notes |
|---|---|---|
| Org. traffic, keywords, top-3 keywords, traffic value | `GET /site-explorer/metrics` | `target`, `date` (**required** — a bare call without it 400s), `mode=subdomains`; add `country=us` for the US-scoped read |
| Domain Rating | `GET /site-explorer/domain-rating` | same required params |
| Referring domains (total) | `GET /site-explorer/backlinks-stats` | reads `metrics.live_refdomains` |
| Keywords in Top 10 | `GET /site-explorer/organic-keywords` | `select=best_position`, counts rows ≤10 client-side; capped at `limit=1000` results, so this undercounts once `org_keywords` exceeds that (expected from ~Q3 onward per `QUARTERLY_TARGETS`) |
| Avg. keywords/page, indexed content pages | `GET /site-explorer/top-pages` | `select=keywords`; page count and keyword-count average, same 1000-row cap |
| Competitor comparison | `GET /site-explorer/metrics` + `/domain-rating` + `/backlinks-stats` | same 3 of the above 5 calls, run once per competitor domain via `POST /api/competitors/sync` |

**Important:** Ahrefs API is metered. Cache all responses in Supabase for 24 hours minimum. Never call the API on every page load. `/api/sync/ahrefs` (main domain) and `/api/competitors/sync` (competitors) are both admin/head-triggered, store results in `metric_snapshots` / `competitors`, and log every attempt to `sync_logs`.

**Rate limiting:** 1 request/second, account-wide (not per domain). All calls above run strictly sequentially with an ~1.1s delay between them — including across competitors in a competitor sync, not just within one domain's calls.

### 7.2 Google Search Console API v1
**Scope:** `https://www.googleapis.com/auth/webmasters.readonly`
**Auth (updated 28 Aug 2026):** Google service account (`GOOGLE_SERVICE_ACCOUNT_EMAIL` /
`GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`), added as a Restricted user on the GSC property —
**not** the OAuth refresh-token flow originally described here, to avoid the 7-day
refresh-token expiry an unverified OAuth app is subject to. `lib/google/auth.ts` mints access
tokens on demand from this service account; the same credentials will back GA4 (Section 7.3)
once that integration is built.
**Base URL (corrected 29 Aug 2026):** `https://searchconsole.googleapis.com/webmasters/v3` —
**not** `/v1`, which 404s specifically for `searchAnalytics.query` (confirmed against the
live API; `/v1` exists and works for other Search Console endpoints, just not this one).

Key endpoints:
- `POST /sites/{siteUrl}/searchAnalytics/query` — pulls clicks, impressions, CTR, position for specified date range and dimensions (query, page, country, device)

Build a GSC service that:
1. Pulls the last 90 days of query data weekly
2. Stores top queries, impressions, and positions in `keyword_history`
3. Compares against Ahrefs position data to validate

### 7.3 Google Analytics 4 (Data API v1)
**Scope:** `https://www.googleapis.com/auth/analytics.readonly`
**Base URL:** `https://analyticsdata.googleapis.com/v1beta`

Key endpoint: `POST /properties/{propertyId}:runReport`

Metrics to pull:
- `sessions`, `totalUsers`, `newUsers`, `bounceRate`, `averageSessionDuration`
- Dimensions: `date`, `country`, `sessionSource`, `sessionMedium`
- Filter by `country = United States` for US-specific metrics

Pull weekly, store aggregated monthly in a `ga4_snapshots` table (add to schema if needed).

### 7.4 Microsoft Clarity API
**Base URL:** `https://www.clarity.ms/export/api/v1`
**Auth:** Bearer token

Key data points:
- Session recordings count
- Heatmap engagement scores
- Top pages by engagement
- Dead clicks, rage clicks, scroll depth

Clarity data supplements the dashboard's "content performance" view. Pull monthly. Store in a `clarity_snapshots` table (add to schema).

**Fallback:** Clarity's API has limited programmatic access. If the API doesn't return what's needed, embed the Clarity dashboard in an `<iframe>` inside the tool using the project's embed URL, accessible only to logged-in users.

---

## 8. Feature Specifications

### 8.1 Login Page (`/login`)
- Email + password via Supabase Auth
- No self-registration. Accounts created by admin only (via `/admin/users`)
- On successful login, redirect to `/dashboard`
- Show EA logo and clean minimal design

---

### 8.2 Main Dashboard (`/dashboard`)

**Purpose:** Real-time view of the 12 KPI metrics from Section 11.2 vs. their quarterly targets.

**Layout:** 12 metric stat tiles at the top, then charts below.

**Stat tiles — one per metric:**

| Metric | Source |
|---|---|
| Domain Rating | Ahrefs |
| Organic Traffic / month (Global) | Ahrefs |
| Organic Traffic / month (US) | Ahrefs |
| Organic Keywords (Global) | Ahrefs |
| Organic Keywords (US) | Ahrefs |
| Keywords Ranked #1–3 | Ahrefs |
| Keywords in Top 10 | Ahrefs |
| Est. Traffic Value / month | Ahrefs |
| Referring Domains (Total) | Ahrefs |
| Quality Ref. Domains (DR30+, dofollow) | Ahrefs (manual entry or calculated) |
| Avg. Keywords per Ranking Page | Ahrefs |
| Live Indexed Content Pages | Ahrefs / GSC |

Each stat tile shows:
- Current value (from latest `metric_snapshots` row)
- Target for current quarter (from `QUARTERLY_TARGETS` constant — see Section 10)
- % variance from target
- RAG badge (Green / Amber / Red — see RAG logic in Section 9)
- Small sparkline showing trend across all snapshots

**Charts section:**
1. Traffic trend (line chart) — Global and US organic traffic over all snapshots, with target lines
2. Domain Rating progression (line chart) — actual vs. target per quarter
3. Keywords distribution (bar chart) — #1–3, #4–10, #11–20 grouped
4. Competitor comparison (horizontal bar chart) — EA vs. all active competitors on DR, traffic, keywords

**Header:** Show active quarter label (e.g. "Q1 — Target date: 30 Sep 2026"), countdown to next quarter-end, and last sync timestamp.

**Sync button:** Visible to `admin` and `head` only. Triggers `/api/sync/ahrefs` manually.

---

### 8.3 Task Tracker (`/tasks`)

**Purpose:** The 34-action register from Section 11.1, turned into a live task board.

**Add/Edit/Delete (admin only — implemented 28 Aug 2026):** a "New Task" button and per-row
Edit/Delete actions appear only for `role = 'admin'` — distinct from the head/owner status
editing already described below. `POST /api/tasks` creates; `PATCH /api/tasks/[id]` accepts
`action_number`/`title`/`description`/`position_responsible`/`assigned_to`/
`co_assigned_to`/`due_date`/`quarter` only when the caller is admin (non-admins get 403 if
they send any of those fields — `status`/`notes` still follow the existing head/owner rule);
`DELETE /api/tasks/[id]` is admin-only (hard delete — `tasks` has no `is_active` column).
RLS: `tasks_delete_admin` (migration `0008`) backs the delete path for defense-in-depth,
though the route itself uses the service-role client.

**Views:** Toggle between List view and Kanban view (columns: Pending / In Progress / Completed / Blocked / Overdue).

**Filters (always visible):**
- My tasks only / All tasks
- By quarter (Q1, Q2, Q3, Q4, Q5)
- By status
- By assigned owner
- Overdue only

**Task card shows:**
- Action number (A1–A34) with colour-coded quarter badge
- Title
- Owner name + avatar
- Co-owner name (if any)
- Due date — red if overdue
- Status badge
- Description (collapsed by default, expand on click)

**Task detail panel (slide-in):**
- Full description
- Action required (from the register)
- Due date
- Assigned to + co-assigned to
- Status dropdown (owner can change their own; admin/head can change any)
- Notes field (free text, saved on blur)
- Activity log (status changes with timestamp + who changed it)
- Link to relevant section of strategy doc

**Overdue logic:** A task is `overdue` if `due_date < today` AND `status` is not `completed`.

**Permissions:**
- `owner` role: can change status and notes only on tasks where they are `assigned_to` or `co_assigned_to`
- `head` and `admin`: can edit all fields on all tasks
- `leadership`: read only

**Q1 highlight:** Tasks A1–A22 (due by 30 Sep 2026) should be visually distinguished — prominent "Q1 Sprint" banner or colour strip.

---

### 8.4 Quarterly Scorecard (`/scorecard`)

**Purpose:** Section 11.4 — the RAG scorecard filled in at each quarter-end.

**Layout:** Quarter selector at top (Baseline / Q1 / Q2 / Q3 / Q4 / Q5). Defaults to most recent quarter.

**Scorecard table columns:**
- Critical Statistic
- Target (from the `quarterly_targets` table — see Section 10.3, "Implemented (28 Aug 2026)")
- Actual (from `metric_snapshots` for the selected quarter)
- Variance (actual − target, shown as % and absolute)
- RAG status badge
- Accountable Owner (from accountability map — see Section 10)

**Edit Targets (`/scorecard/edit`, admin only — implemented 28 Aug 2026):** a link on
`/scorecard` visible only to `admin`. Lets an admin correct any quarter's target numbers
(all 12 metrics) without a code deploy — `PATCH /api/admin/targets`. Does **not** edit
Actual values (those still come from `/admin/metrics` or a sync); this only changes what
"on target" means. Target and Actual are intentionally kept separate — see Section 12
note 11.

**RAG thresholds (from Section 11.4 of strategy doc):**
- 🟢 Green — actual ≥ 95% of target
- 🟡 Amber — actual is 80–94% of target
- 🔴 Red — actual < 80% of target

**Additional scorecard row:** "Actions A1–A22 completed on time" — manually toggled by Tabish (head role). Shows 22/22 or actual count.

**Export button:** Export current quarter scorecard as PDF or CSV. Admin/head only.

**Notes field per row:** Allows Tabish or Abdullah to add a written reason for any amber/red metric (e.g. "Disavow reprocessing still pending — expected to clear in December").

---

### 8.5 Competitor Tracker (`/competitors`)

**Purpose:** Live comparison of EA vs. all tracked competitor domains.

**Table view:** One row per competitor, columns: Rank, Company, Domain, DR, Traffic/mo, Keywords, #1–3 Keywords, Est. Value, Ref. Domains, Last Synced.

- Sortable by any column
- EA's row always pinned and highlighted. **Implemented** (`lib/competitors.ts`'s `compareToEA`)
  — EA's latest `metric_snapshots` row renders as a highlighted first row, and each
  competitor's cell shows a ▲/▼ + % delta versus EA (green ahead, red behind), not just a
  delta from the competitor's own last sync.
- Weekly history is captured automatically into `competitor_snapshots` (Section 5.11) by the
  weekly cron (Section 8.9) — no trend chart built on top of it yet.

**Add/Edit competitor:** Admin only. Modal form — company name, domain. Ahrefs data auto-populated on next sync.

**Sync:** Implemented — "Sync competitors" button on `/competitors` (admin/head), `POST /api/competitors/sync`. Syncs active competitors one at a time (Ahrefs' rate limit is account-wide) and writes `last_synced_at`. Logic lives in `lib/ahrefs/competitorSync.ts` so the weekly cron (Section 8.9) can reuse it.

**Competitor detail page (`/competitors/[domain]`):**
- Full Ahrefs metrics for that domain
- Top pages and top keywords (pulled from Ahrefs)
- Notes field for strategic commentary

**Important:** The initial list will be provided by Tabish and Talha after 25 August 2026. The schema and UI must support adding/removing competitors without code changes.

---

### 8.6 Keyword Rank Tracker (`/keywords`)

**Purpose:** Track EA's keyword positions over time. Maps to Sections 4.1, 4.2, and 4.4 of the strategy doc.

**Views:** Table with filters by category:
- Striking Distance (Priority 1 — currently positions 11–28)
- Commercial Money Terms (Priority 2)
- Glossary Terms (Priority 3)
- Niche Cluster (Priority 4)

**Table columns:** Keyword, Volume, KD, Current Position, Previous Position, Change (▲▼), Target URL, Category, Priority, CPC, Last Updated.

**Position history chart:** Click any keyword row to see a position history line chart over time.

**Import:** Admin can bulk-import keywords via CSV (columns: keyword, volume, kd, cpc, category, priority, target_url).

**GSC overlay:** Where GSC data is available for a keyword (clicks, impressions, CTR), show it alongside Ahrefs position data.

---

### 8.7 Audit Reports (`/audit`)

**Purpose:** Track SEO audit findings and their resolution status.

**Finding card shows:** Category, Severity badge, Finding summary, Recommendation, Assigned to, Status, Date added.

**Categories:** Technical, Backlink, Content, On-Page, Architecture.

**Filters:** By category, severity, status, assigned owner.

**Pre-seeded findings from the strategy doc** (see Section 10.2 for the seed list).

**New finding form:** Admin/head can add findings manually. All users can see all findings (read-only for `owner` and `leadership` roles).

---

### 8.8 Weekly Report (`/weekly-report`)

**Purpose:** Automated weekly snapshot for Talha Azeem and Syed Ali (mentioned in Addendum B.8 — "Give Talha and Syed Ali weekly visibility rather than quarterly").

**Content of weekly report:**
- Current vs. target for all 12 KPIs
- Tasks due in the next 7 days (by owner)
- Tasks overdue (by owner)
- Any metrics that have moved since last week
- New keyword position changes (top movers up and down)

**Generation:** Auto-generated every Monday at 9 AM PKT. Stored in `weekly_reports` table. Viewable in-app by all users. Email notification to Talha and Syed Ali (optional — use Supabase Edge Functions with Resend or similar).

**Manual trigger:** Admin can generate a weekly report on-demand.

---

### 8.9 Admin Panel (`/admin`)

Accessible only to `admin` role (Abdullah Shekha).

**Sub-pages:**
- `/admin/users` — Create, edit, deactivate user accounts. Set role. Cannot delete (soft deactivate only). **Implemented.**
- `/admin/sync` — Trigger manual Ahrefs sync (also triggerable from `/dashboard`), view `sync_logs`. **Implemented for Ahrefs.** GSC keyword-refresh sync is also implemented, but triggered from `/keywords` instead (see Section 8.6) — GA4/Clarity still have no integration code yet (v2, Section 12.5–12.6).
- `/admin/metrics` — Manually enter or correct a quarterly metric snapshot. Required for "quality referring domains" (this requires manual census, not API). **Implemented** — patches the existing same-day snapshot rather than inserting a duplicate, so it merges with whatever the day's Ahrefs sync already wrote.
- `/admin/settings` — Ahrefs target domain (used by `/api/sync/ahrefs`), plus GSC site URL / GA4 property ID fields stored for when those integrations are built. **Implemented**, except quarter start/end dates, which intentionally stay in `lib/constants.ts` (Section 9.3) and are shown read-only here.

Admin sub-pages render as tabs under a shared `app/(dashboard)/admin/layout.tsx` (`/admin`
redirects to `/admin/users`) rather than as separate unlinked pages.

**Weekly automation:** `GET /api/cron/weekly-snapshot`, scheduled every Monday 04:00 UTC
(09:00 PKT — matches the `weekly_reports` cadence in Section 8.8) via `vercel.json`'s
`crons` config. Authenticated by `CRON_SECRET` (a Vercel Cron job has no logged-in user, so
this doesn't go through `getCurrentProfile()` like every other sync route). Runs the same
GSC sync (`lib/gsc/sync.ts`) and competitor Ahrefs sync (`lib/ahrefs/competitorSync.ts`)
logic the manual buttons use, then additionally writes one `competitor_snapshots` row per
active competitor. Logs to `sync_logs` with `source: 'weekly-cron'` and `triggered_by: null`.

---

## 9. Business Logic

### 9.1 RAG Status Calculation (`lib/rag.ts`)

```typescript
export type RAGStatus = 'green' | 'amber' | 'red' | 'no-data';

export function calculateRAG(actual: number | null, target: number): RAGStatus {
  if (actual === null || actual === undefined) return 'no-data';
  const pct = actual / target;
  if (pct >= 0.95) return 'green';
  if (pct >= 0.80) return 'amber';
  return 'red';
}
```

**Note:** For metrics where lower is better (e.g. if any are added in future), invert the logic. All current metrics are higher-is-better.

### 9.2 Task Status Auto-Update
A background check (Supabase cron or Next.js cron route) runs daily and sets `status = 'overdue'` on any task where `due_date < today` AND `status IN ('pending', 'in_progress', 'blocked')`.

### 9.3 Quarter Detection
Determine the current quarter from today's date against the defined quarter boundaries:
- Q1: 24 Aug 2026 – 30 Sep 2026
- Q2: 1 Oct 2026 – 31 Dec 2026
- Q3: 1 Jan 2027 – 31 Mar 2027
- Q4: 1 Apr 2027 – 30 Jun 2027
- Q5: 1 Jul 2027 – 30 Sep 2027

Store quarter boundaries in `lib/constants.ts` as a configurable array so Haroon can extend the programme.

---

## 10. Seed Data

### 10.1 Team Members (seed into `profiles` via admin)

Original seed roles below; **roles were reassigned 28 Aug 2026** (Syed Ali and Haroon
promoted to `admin`, Tabish moved from `head` to `owner`) — see Section 12.10 for the
current, authoritative role table.

| Full Name | Role (original seed) | Job Title |
|---|---|---|
| Abdullah Shekha | admin | Analyst / Supervisor |
| Tabish Khalid | head | Head of SEO & Content |
| Talha Azeem | owner | Technical SEO / Content Strategist |
| Usman Ali | owner | Web Developer |
| Najma Furqan | owner | Content Strategy Execution / Editor |
| Lavi Shamoon | owner | SME Writer |
| Syed Ali | owner | Director of Marketing |
| Hameed Ishaq | owner | Designer |
| Haroon | leadership | Leadership / CMO |
| Adeela | leadership | CPA Reviewer |

### 10.2 34 Actions (`tasks` seed)

**Superseded 28 Aug 2026 for 6 team members.** The SEO team provided updated per-person
action trackers (`Documents from SEO Team/EA_SEO_Team_Action_Tracker_Updated.xlsx`).
Najma Furqan, Usman Ali, Haroon, Syed Ali, Abdullah Shekha, and Hameed Ishaq's original
primary-owned tasks below were deleted and replaced with 43 new tasks (`A35`–`A77`) sourced
from that file — the original numbering (A1, A3, A5, A6, A8, A9, A11, A13, A15, A16, A17,
A21, A22, A24, A28, A29, A31, A32) is reused below for historical reference only and no
longer reflects live data for those 6 people. **Talha Azeem, Lavi Shamoon, and Tabish
Khalid's tasks were left untouched** (no updated tracker existed for them). The new tasks'
`notes` field carries the original "Ownership"/"Category"/due-date-as-written text verbatim
where it couldn't be cleanly mapped to a real column (e.g. "Ongoing", "(To be decided)",
multi-person collaboration credit beyond the single `co_assigned_to` FK).

Original seed (still live for Talha/Lavi/Tabish; historical reference only for the other 6):

| Action | Title | Primary Owner | Co-Owner | Due Date | Quarter |
|---|---|---|---|---|---|
| A1 | Terminate paid link-building vendor | Haroon | Tabish Khalid | 2026-08-27 | Q1 |
| A2 | Programme kickoff and RACI sign-off | Tabish Khalid | — | 2026-08-27 | Q1 |
| A3 | Agree CPA review SLA | Haroon | Najma Furqan | 2026-08-27 | Q1 |
| A4 | Assign cross-training backups | Tabish Khalid | — | 2026-08-29 | Q1 |
| A5 | Stand up tracking infrastructure | Abdullah Shekha | — | 2026-08-29 | Q1 |
| A6 | Fix eaccelerated.com redirect (302→301) | Usman Ali | Talha Azeem | 2026-08-29 | Q1 |
| A7 | Classify full referring-domain list (all 861) | Talha Azeem | — | 2026-09-02 | Q1 |
| A8 | Resolve UR 9.9 Cloudflare 404 | Usman Ali | Talha Azeem | 2026-09-02 | Q1 |
| A9 | Brief all 15 striking-distance pages | Najma Furqan | — | 2026-09-02 | Q1 |
| A10 | File disavow in Search Console | Talha Azeem | — | 2026-09-05 | Q1 |
| A11 | Recover UR 11.7 redirect chains | Usman Ali | Talha Azeem | 2026-09-05 | Q1 |
| A12 | Restore /fractional-cfo-services/ | Talha Azeem | Najma Furqan | 2026-09-05 | Q1 |
| A13 | Resolve HTTP/HTTPS duplication | Usman Ali | Talha Azeem | 2026-09-12 | Q1 |
| A14 | Resolve keyword cannibalisation | Talha Azeem | Najma Furqan | 2026-09-12 | Q1 |
| A15 | Implement schema markup (Org, Service, FAQ, Breadcrumb) | Usman Ali | Talha Azeem | 2026-09-12 | Q1 |
| A16 | Claim software partner directories | Syed Ali | — | 2026-09-12 | Q1 |
| A17 | Claim TPM / CPG vendor listings | Syed Ali | — | 2026-09-19 | Q1 |
| A18 | Full Ahrefs Site Audit and remediation | Talha Azeem | Usman Ali | 2026-09-26 | Q1 |
| A19 | Optimise all 15 striking-distance pages | Lavi Shamoon | Najma Furqan | 2026-09-30 | Q1 |
| A20 | Implement silo internal linking | Talha Azeem | Najma Furqan | 2026-09-30 | Q1 |
| A21 | Join chambers and associations | Syed Ali | Haroon | 2026-09-30 | Q1 |
| A22 | Field CPG Benchmark survey | Syed Ali | Haroon | 2026-09-30 | Q1 |
| A23 | Optimise 7 non-ranking service pages | Lavi Shamoon | Najma Furqan | 2026-10-31 | Q2 |
| A24 | Build interactive calculators | Hameed Ishaq | Usman Ali | 2026-11-30 | Q2 |
| A25 | Launch glossary phase 1 (30 terms) | Lavi Shamoon | Najma Furqan | 2026-11-30 | Q2 |
| A26 | Publish CPG Finance Benchmark Report | Syed Ali | Hameed Ishaq | 2026-12-31 | Q2 |
| A27 | Build 6 pillar pages | Lavi Shamoon | Najma Furqan | 2026-12-31 | Q2 |
| A28 | Complete podcast circuit round 1 (8+ appearances) | Syed Ali | — | 2027-01-31 | Q3 |
| A29 | Secure contributed columns (Forbes/Entrepreneur/Inc.) | Syed Ali | — | 2027-02-28 | Q3 |
| A30 | Glossary phase 2 (expand to 60 terms) | Lavi Shamoon | Najma Furqan | 2027-03-31 | Q3 |
| A31 | Conversion optimisation on money pages | Najma Furqan | Abdullah Shekha | 2027-03-31 | Q3 |
| A32 | Second research drop | Syed Ali | Hameed Ishaq | 2027-06-30 | Q4 |
| A33 | Glossary phase 3 and vertical expansion (90 terms) | Lavi Shamoon | Najma Furqan | 2027-09-30 | Q5 |
| A34 | Re-run full report each quarter | Tabish Khalid | Abdullah Shekha | Recurring | All |

### 10.3 Quarterly Targets (`lib/constants.ts`)

**Implemented (28 Aug 2026):** these values now live in the `quarterly_targets` table
(migration `0007_quarterly_targets.sql`), seeded from exactly the numbers below, and are
editable by admins via `/scorecard/edit` (Section 8.4). `lib/targets.ts`'s
`getQuarterlyTargets()` reads from the table and falls back to this constant only if the
table is empty (e.g. the migration hasn't been run yet in a given environment) — the
constant below is the seed data / fallback default, not the live source of truth anymore.

```typescript
export const QUARTERLY_TARGETS = {
  baseline: {
    label: 'Baseline',
    date: '2026-08-23',
    domain_rating: 24,
    organic_traffic_global: 286,
    organic_traffic_us: 260,
    organic_keywords_global: 115,
    organic_keywords_us: 86,
    keywords_top_3: 16,
    keywords_top_10: 96,
    traffic_value_monthly: 1467,
    referring_domains_total: 861,
    referring_domains_quality: 35,
    avg_keywords_per_page: 2.5,
    indexed_content_pages: 45,
  },
  Q1: {
    label: 'Q1',
    date: '2026-09-30',
    domain_rating: 25,
    organic_traffic_global: 520,
    organic_traffic_us: 480,
    organic_keywords_global: 240,
    organic_keywords_us: 190,
    keywords_top_3: 34,
    keywords_top_10: 189,
    traffic_value_monthly: 2900,
    referring_domains_total: 900,
    referring_domains_quality: 75,
    avg_keywords_per_page: 4,
    indexed_content_pages: 60,
  },
  Q2: {
    label: 'Q2',
    date: '2026-12-31',
    domain_rating: 32,
    organic_traffic_global: 1600,
    organic_traffic_us: 1470,
    organic_keywords_global: 700,
    organic_keywords_us: 550,
    keywords_top_3: 105,
    keywords_top_10: 505,
    traffic_value_monthly: 8500,
    referring_domains_total: 1030,
    referring_domains_quality: 160,
    avg_keywords_per_page: 8,
    indexed_content_pages: 100,
  },
  Q3: {
    label: 'Q3',
    date: '2027-03-31',
    domain_rating: 39,
    organic_traffic_global: 2900,
    organic_traffic_us: 2670,
    organic_keywords_global: 1250,
    organic_keywords_us: 985,
    keywords_top_3: 205,
    keywords_top_10: 875,
    traffic_value_monthly: 16000,
    referring_domains_total: 1180,
    referring_domains_quality: 260,
    avg_keywords_per_page: 13,
    indexed_content_pages: 155,
  },
  Q4: {
    label: 'Q4',
    date: '2027-06-30',
    domain_rating: 45,
    organic_traffic_global: 4800,
    organic_traffic_us: 4450,
    organic_keywords_global: 1950,
    organic_keywords_us: 1540,
    keywords_top_3: 370,
    keywords_top_10: 1390,
    traffic_value_monthly: 28000,
    referring_domains_total: 1350,
    referring_domains_quality: 370,
    avg_keywords_per_page: 18,
    indexed_content_pages: 210,
  },
  Q5: {
    label: 'Q5',
    date: '2027-09-30',
    domain_rating: 50,
    organic_traffic_global: 7500,
    organic_traffic_us: 6990,
    organic_keywords_global: 2800,
    organic_keywords_us: 2205,
    keywords_top_3: 570,
    keywords_top_10: 2000,
    traffic_value_monthly: 46000,
    referring_domains_total: 1540,
    referring_domains_quality: 490,
    avg_keywords_per_page: 23,
    indexed_content_pages: 260,
  },
};
```

### 10.4 Accountability Map (`lib/constants.ts`)
From Section 11.3 — used to populate the "Accountable Owner" column in the scorecard.

```typescript
export const ACCOUNTABILITY_MAP: Record<string, string[]> = {
  domain_rating:              ['Talha Azeem', 'Syed Ali'],
  referring_domains_quality:  ['Syed Ali'],
  referring_domains_total:    ['Syed Ali'],
  keywords_top_3:             ['Lavi Shamoon', 'Najma Furqan'],
  organic_keywords_global:    ['Lavi Shamoon', 'Najma Furqan'],
  avg_keywords_per_page:      ['Talha Azeem', 'Najma Furqan'],
  indexed_content_pages:      ['Lavi Shamoon'],
  traffic_value_monthly:      ['Najma Furqan', 'Tabish Khalid'],
  organic_traffic_us:         ['Najma Furqan', 'Tabish Khalid'],
  organic_traffic_global:     ['All owners'],
};
```

### 10.5 Pre-seeded Audit Findings
Seed these into `audit_reports` on first run:

| Category | Severity | Finding | Assigned To |
|---|---|---|---|
| Backlink | Critical | 17 referring domains explicitly advertise selling backlinks (pbnseolinks.shop, buybacklinks.agency, buyseobacklinks.shop, etc.) | Talha Azeem |
| Technical | Critical | Two highest-equity URLs (/accounts-payable/, /general-accounting-and-bookkeeping/ at UR 11.7) are 301 redirects | Usman Ali |
| Technical | Critical | /cdn-cgi/l/email-protection (UR 9.9) returns 404 — Cloudflare artefact with accumulated links | Usman Ali |
| Technical | Critical | /fractional-cfo-services/ (UR 9.9) is a 301 redirect — target keyword worth 14,000 searches/mo at $10 CPC | Talha Azeem |
| Technical | High | eaccelerated.com redirects with 302 (temporary) instead of 301 — not consolidating link equity | Usman Ali |
| Technical | High | HTTP and HTTPS versions of pages both return 200 — no canonical consolidation | Usman Ali |
| Architecture | High | Perfectly flat site architecture — every page at UR 6.9, nothing prioritised | Talha Azeem |
| Content | High | /manufacturing-accounting/ exists but ranks for none of its head terms (KD 0) | Lavi Shamoon |
| Content | High | /ecommerce-accounting/ exists but ranks for none of its head terms | Lavi Shamoon |
| Content | High | /amazon-accounting/ exists but ranks for none of its head terms (KD 0) | Lavi Shamoon |
| Content | High | /trade-promotions-management/ exists but ranks for none of its head terms | Lavi Shamoon |
| Content | High | /fractional-cfo-services/ (301'd) — 14,000 searches/mo, EA earns zero traffic | Najma Furqan |
| Technical | Medium | Keyword cannibalisation: /blog/how-much-does-a-cpa-cost/ vs /cpa-cost/ competing on same intent | Talha Azeem |
| Technical | Medium | /inventory-management/ and /inventory-management-services/ duplicated | Talha Azeem |
| Technical | Medium | /blog/ and /blogs/ both exist — duplicate resource hub | Usman Ali |
| Architecture | Medium | No hub-and-spoke internal linking — service, industry, location pages all isolated | Talha Azeem |
| Technical | Medium | No schema markup deployed (Organization, Service, FAQPage, BreadcrumbList) | Usman Ali |

---

## 11. Development Setup

```bash
# 1. Clone and install
git clone <repo>
cd ea-seo-tracker
pnpm install

# 2. Set up Supabase
# Create a new Supabase project at supabase.com
# Copy the project URL and anon key into .env.local

# 3. Run database migrations
npx supabase db push
# Or apply manually via Supabase SQL editor

# 4. Seed the database
# Run supabase/seed.sql in Supabase SQL editor

# 5. Start dev server
pnpm dev
# → http://localhost:3000

# 6. Create first admin user
# In Supabase auth dashboard, create a user with Abdullah's email
# Then in the profiles table, set role = 'admin' for that user ID
```

---

## 12. Important Notes for Implementation

**1. Competitors list finalised 28 Aug 2026.** The original 19-domain placeholder list is
deactivated (`is_active = false`, not deleted). The live list is now the 8 domains from
`Documents from SEO Team/Expertise Accelerated SEO and Competitors.docx`: bench.co,
1800accountant.com, accountingdepartment.com, nowcfo.com, bookkeeping-services.com,
bookkeeper.com, sdocpa.com, skfinancial.com — with DR/traffic/keywords/ref-domains seeded
from that doc's snapshot (not yet Ahrefs-synced as of import; run "Sync competitors" to
refresh). The `competitors` table with admin CRUD is still the right approach for future
changes.

**2. Keywords list finalised 28 Aug 2026.** The original placeholder keywords are
deactivated (`is_active = false`, not deleted). The live list is now the 96 keywords from
`Documents from SEO Team/EA Keywords - SEO.xlsx`'s "Keywords Q1" sheet — imported with only
the `keyword` field populated (that sheet had no volume/KD/CPC/category/priority/target_url
data); those fields can be filled in via the existing CSV re-import flow or manual edits.
Run "Refresh from GSC" afterward to populate `current_position` for any of these that GSC
already has data for.

**3. Quality referring domains requires manual entry.** The Ahrefs API doesn't cleanly filter for DR30+, dofollow, non-spam in a single call. Abdullah will run this census manually each quarter and enter the figure via `/admin/metrics`. The automatic sync should not overwrite this field.

**4. Ahrefs API access level matters.** Verify which API plan EA has. The v3 API with Site Explorer access is needed for most of the integrations above. If only Rank Tracker API is available, adjust the data sources accordingly and note what falls back to manual entry.

**5. Google auth must cover both GSC and GA4.** A single Google service account (`GOOGLE_SERVICE_ACCOUNT_EMAIL` / `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`) covers both, added as a user on the GSC property and a Viewer on the GA4 property — not the OAuth refresh-token flow this note originally described (see Section 7.2's Auth note). `lib/google/auth.ts` mints scoped access tokens on demand; GA4 (Section 7.3) should reuse the same module rather than growing a parallel auth path.

**6. Microsoft Clarity API is limited.** If the programmatic API doesn't provide the needed metrics, fall back to an embedded iframe of the Clarity dashboard. Wrap it in an auth check so only logged-in EA users can view it.

**7. No public-facing pages.** Every route must be behind Supabase auth. `middleware.ts` should redirect all unauthenticated requests to `/login`. There is no public dashboard, no sharing links, no guest access.

**8. Mobile responsiveness is secondary.** The team uses this on desktops. Build for desktop-first (1280px+) and ensure it doesn't break on tablets. Mobile phone optimisation is not required in v1.

**9. Data is additive.** Never delete or overwrite historical `metric_snapshots`. Each quarter-end creates a new row. Historical rows are read-only once created.

**10. Multiple admins as of 28 Aug 2026 (supersedes the original "Abdullah is the only
admin" rule).** Abdullah Shekha requested Syed Ali and Haroon be promoted to `admin`, and
Tabish Khalid moved from `head` to `owner` (so the `head` role is currently vacant). Nothing
in code enforced a single-admin constraint (it was a documented convention, not a DB
constraint or check), so this was a plain `profiles.role` update for the three affected
rows — no schema or RLS change needed, since every `admin`-gated check already compares
`role === 'admin'` generically rather than a specific user. Current authoritative roles:

| Full Name | Role |
|---|---|
| Abdullah Shekha | admin |
| Syed Ali | admin |
| Haroon | admin |
| Tabish Khalid | owner |
| Talha Azeem, Usman Ali, Najma Furqan, Lavi Shamoon, Hameed Ishaq | owner |
| Adeela | leadership |

If this needs to change again, update `profiles.role` directly (no admin UI exists for
bulk role changes) and update this section plus Section 4's role table to match.

**11. Scorecard Target vs. Actual are deliberately separate editable surfaces (28 Aug
2026).** `/scorecard/edit` (admin only) edits **Target** numbers in `quarterly_targets`.
Actual numbers are a different table (`metric_snapshots`) edited via `/admin/metrics` or
written by a sync. Abdullah's stated direction: Actual should eventually be pulled
automatically from GA4/GSC first, then Ahrefs/Clarity — not built yet (v2, Section 12.5–12.6)
— manual entry via `/admin/metrics` remains the only way to set Actual values until then.

---

## 13. Definition of Done (v1)

The tool is considered v1-complete when:
- [x] All 9 team members can log in and see the dashboard
- [x] All 34 tasks are seeded and visible with correct owners and due dates
- [x] The Q1 scorecard tab shows targets vs. the baseline snapshot
- [x] Ahrefs data syncs manually via admin trigger and populates all stat tiles
- [x] The task tracker allows owners to update their own task status
- [x] The audit findings are seeded and visible
- [x] The admin panel allows Abdullah to add users and enter manual metric snapshots
- [x] The competitor table is editable (add/remove domains)
- [x] The keyword table supports CSV import

Everything in Section 8 beyond this list is v2 scope (weekly email reports, GA4 integration, Clarity embed, charts/sparklines) and should be built after v1 is stable and in use by the team.

## 14. Implementation Status (as of 28 Aug 2026)

The bullets in Section 13 are the original v1 checklist and are all functionally in place, but
a few things worth knowing before calling this done:

**Solid:**
- Dashboard, scorecard, task tracker (with correct owner-scoped RLS), competitors, keywords,
  audit findings — all working against real data.
- Ahrefs sync (main domain and competitors) populates every field it can reach via the API;
  `referring_domains_quality` correctly stays manual-only.
- `/admin/sync` and `/admin/settings` (Section 8.9), now rendered as tabs under a shared
  admin layout rather than separate unlinked pages.
- Same-day sync/manual-entry no longer clobber each other — `/api/sync/ahrefs`,
  `/api/sync/gsc`, and `/api/admin/metrics` all patch the existing row for the day instead of
  inserting a duplicate, and `getLatestSnapshot`/`getAllSnapshots` (`lib/metrics.ts`) have a
  deterministic `created_at` tiebreaker so the dashboard and scorecard can't pick a stale row.
- GSC integration (Section 7.2) — service-account auth (`lib/google/auth.ts`), keyword
  refresh from `/keywords`, and the weekly cron all working.
- Competitor comparison (Section 8.5) — EA pinned row + per-metric delta vs. EA
  (`lib/competitors.ts`).
- Notification bell (Topbar) — live-computed overdue/deadline-soon/status-changed
  notifications (`lib/notifications.ts`); no persisted notifications table.
- Weekly `competitor_snapshots` history + automated Monday cron for both GSC keywords and
  competitors (Section 8.9's "Weekly automation").
- Quarterly Target values moved from a hardcoded constant to an admin-editable
  `quarterly_targets` table, editable via `/scorecard/edit` (Section 8.4/10.3).
- Live tasks/competitors/keywords data replaced from the SEO team's updated planning
  documents (Section 10.2/12 notes 1-2) — 58 tasks, 8 competitors, 96 keywords as of import.

**Known gaps (not yet built):**
- Task detail slide-in panel's full activity log (Section 8.3) — `tasks.updated_by` (added
  this session) records only the *last* change, not a full history of every status change.
- Daily overdue auto-update (Section 9.2) — no cron/scheduled function exists; "overdue" is
  computed live in the UI filter, never persisted to `tasks.status`.
- Scorecard's "Actions A1–A22 completed on time" toggle and PDF/CSV export (Section 8.4).
- Weekly report (`/weekly-report`), GA4, Microsoft Clarity — all confirmed v2, no code exists
  for any of them, as intended.
- A permission bug reported for task status editing (owners editing others' tasks) could not
  be reproduced against the current code or live data as of this session — the PATCH route
  and RLS both correctly scope `owner`-role edits to tasks the user is `assigned_to`/
  `co_assigned_to` on. Revisit with specific repro steps if it recurs.

---

*This document is the single source of truth for the EA SEO Tracker build. Update it as the project evolves.*
*Last updated: 28 August 2026 — Abdullah Shekha*
