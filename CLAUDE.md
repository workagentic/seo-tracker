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
Pre-seeded but editable. As of 1 Sep 2026 this holds the 92-task, 5-week September production
sprint (see Section 10.2) rather than the original 34-action strategy-doc register.

**Ownership model rebuilt 2 Sep 2026 (migration `0024_task_ownership_rebuild.sql`, CLAUDE.md
Section 14 Phase 2)** — Co-Owner and the whole approval workflow (`approver_id`,
`submitted_for_review`/`changes_requested`) are gone, replaced by a two-tier model: **Owner**
(renamed from the old "Assigned to" field, restricted at the app layer — `lib/tasks/constants.ts`'s
`ELIGIBLE_OWNER_NAMES` — to exactly Tabish Khalid / Syed Ali / Najma Furqan; only the Owner can
mark a task Completed) and **Assigned To** (new field, open to any profile including
leadership-role people, who are otherwise read-only everywhere else in the app — Section 4).
Status is now 4 values only; `overdue` is no longer stored, it's a purely visual/computed
red-flag instead (Section 9.2, Phase 3). `category` became `category_id`, an FK into the new
`task_categories` table (Section 5.18) instead of free text.
```sql
create table tasks (
  id uuid primary key default gen_random_uuid(),
  action_number text not null,          -- e.g. "S1", "L1", "B1", "T1", "A16-W1"
  title text not null,
  description text,
  position_responsible text,            -- human-readable, e.g. "Tabish & Talha"
  owner_id uuid references profiles(id),        -- renamed from assigned_to 2 Sep 2026;
                                                 -- app-layer-restricted to 3 people (above)
  assigned_to_id uuid references profiles(id),  -- added 2 Sep 2026; whoever's doing the
                                                 -- hands-on work right now, open to anyone
  due_date date,
  deadline date,                        -- added 2 Sep 2026; set on handoff, must never be
                                         -- later than due_date (CHECK constraint + app-layer)
  status text not null default 'pending'
    check (status in ('pending', 'in_progress', 'on_hold', 'completed')),
  quarter text,                         -- e.g. "Q1", "Q2" -- bare calendar-quarter label, no
                                         -- year (Section 14 Phase 1), recurs every year
  category_id uuid references task_categories(id),  -- was free-text `category` before 2 Sep 2026
  notes text,
  link_url text,                        -- added 0017_task_link_url.sql (Section 8.3)
  repeats text,                         -- added 0018_task_recurrence.sql; freeform cadence
                                         -- label, e.g. "Weekly, on Friday" (Section 8.3)
  next_due date,                        -- added 0018_task_recurrence.sql; stands in for
                                         -- due_date wherever overdue-ness is computed once set
  linked_finding_id uuid references audit_reports(id),   -- added 0019_task_links.sql
  linked_keyword_id uuid references tracked_keywords(id), -- added 0019_task_links.sql
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

### 5.13 `ga4_snapshots`
Added `0009_ga4_snapshots.sql`. See Section 7.3. One row per day (patch-today's-row
pattern), Global and US aggregates side by side, trailing-28-day window each pull.
```sql
create table ga4_snapshots (
  id uuid primary key default gen_random_uuid(),
  snapshot_date date not null,
  sessions_global integer,
  users_global integer,
  new_users_global integer,
  bounce_rate_global numeric,
  avg_session_duration_global numeric,
  sessions_us integer,
  users_us integer,
  new_users_us integer,
  bounce_rate_us numeric,
  avg_session_duration_us numeric,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);
```

### 5.14 `clarity_snapshots`
Added `0010_clarity_snapshots.sql`. See Section 7.4. One row per day, trailing-3-day window
each pull (the plan's hard cap, not a design choice). `top_pages` is a JSON array of
`{ url, visits }`.
```sql
create table clarity_snapshots (
  id uuid primary key default gen_random_uuid(),
  snapshot_date date not null,
  total_sessions integer,
  bot_sessions integer,
  distinct_users integer,
  dead_click_count integer,
  rage_click_count integer,
  script_error_count integer,
  avg_scroll_depth numeric,
  top_pages jsonb,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);
```

### 5.15 `task_activity`
Added `0012_task_activity.sql`. See Section 8.3. One row per changed field per `PATCH
/api/tasks/[id]` call — a single request that changes both `status` and `notes` produces
two rows.
```sql
create table task_activity (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references tasks(id) on delete cascade,
  changed_by uuid references profiles(id),
  field text not null,
  old_value text,
  new_value text,
  created_at timestamptz default now()
);
```

### 5.16 `task_comments`
Added `0016_task_comments.sql`. See Section 8.3. Distinct from `tasks.notes` (a single
overwritable field with no UI) — this is an append-only conversation thread, immutable once
posted (no edit/delete), same convention as `task_activity`.
```sql
create table task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references tasks(id) on delete cascade,
  author_id uuid references profiles(id),
  body text not null,
  created_at timestamptz default now()
);
```

### 5.17 `lead_sources` / `leads`
Added `0022_leads.sql`. Admin-only (`role = 'admin'` exactly, not `head`) throughout — RLS,
API routes, and a `middleware.ts` route guard on `/leads`, unlike the rest of this app where
`admin`/`head` are treated equivalently. See Section 8.10 and
`docs/superpowers/specs/2026-09-02-leads-kanban-design.md`.

### 5.18 `task_categories`
Added `0024_task_ownership_rebuild.sql` (2 Sep 2026, CLAUDE.md Section 14 Phase 2), replacing
free-text `tasks.category`. Auto-seeded with the 11 values already in use across the September
sprint. Admin-CRUD (add/edit/delete) is Phase 4 — this migration only creates and seeds the
table; everyone can read it (needed to populate the Category select on `/tasks`), only admins
can write.
```sql
create table task_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz default now()
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
tokens on demand from this service account; the same credentials also back GA4 (Section 7.3,
implemented 29 Aug 2026).
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
**Implemented 29 Aug 2026.** `lib/ga4/client.ts`'s `fetchGa4Metrics()` reuses the same
service-account auth as GSC (`lib/google/auth.ts`, scope
`https://www.googleapis.com/auth/analytics.readonly`) — confirmed working against the live
API (real data returned: Direct/Organic Search/Referral channel breakdown).

**Base URL:** `https://analyticsdata.googleapis.com/v1beta`

Key endpoint: `POST /properties/{propertyId}:runReport`

Metrics pulled: `sessions`, `totalUsers`, `newUsers`, `bounceRate`, `averageSessionDuration`,
over the trailing 28 days, as two separate calls — unfiltered (Global) and filtered
`country = United States` (US) — mirroring the Global/US split pattern already used for
Ahrefs metrics. No per-day/per-country dimension breakdown is stored, just the two
aggregates, since the dashboard only shows current Global/US totals (Section 8.2).

Stored in `ga4_snapshots` (Section 5.13) — one row per day, "patch today's row" pattern like
`metric_snapshots`/`keyword_history`. `lib/ga4/sync.ts`'s `runGa4Sync()` is called from both
`POST /api/sync/ga4` (manual button on `/dashboard`, admin/head only) and the weekly cron
(`/api/cron/weekly-snapshot`, Section 8.9). `app_settings.ga4_property_id` (editable via
`/admin/settings`) is the property ID source, same DB-driven pattern as `gsc_site_url`/
`target_domain` — not the `GA4_PROPERTY_ID` env var, which is local-dev reference only.

Displayed in a "Website Analytics (GA4)" card on `/dashboard` (`Ga4Panel`) — Global and US
side by side, no RAG/target coloring (GA4 metrics aren't part of the 12-KPI target system).

### 7.4 Microsoft Clarity API
**Implemented 29 Aug 2026.** `lib/clarity/client.ts`'s `fetchClarityInsights()`.

**Base URL (corrected):** `https://www.clarity.ms/export-data/api/v1` — **not**
`/export/api/v1` as originally documented here, which 404s. Confirmed against the live API.
**Auth:** Bearer token (`CLARITY_API_TOKEN`).

**Key endpoint:** `GET /project-live-insights?numOfDays=3` — `numOfDays` is **capped at 3** on
the current plan (7 returns `400 Bad Request`), so this can only ever report a trailing
3-day window, never a full week or month.

Metrics pulled: total/bot session counts, distinct users, dead click / rage click / script
error counts, average scroll depth, and top 5 pages by visits (from the API's `Traffic`,
`DeadClickCount`, `RageClickCount`, `ScriptErrorCount`, `ScrollDepth`, and `PopularPages`
metrics — the API returns 16 metrics total; `Browser`/`Device`/`OS`/`Country`/`PageTitle`/
`ReferrerUrl`/`ExcessiveScroll`/`ErrorClickCount`/`EngagementTime` are available but not
currently surfaced).

**Bot traffic finding (29 Aug 2026):** live data showed 127 of 132 sessions (96%) flagged as
bot by Clarity's own `totalBotSessionCount` field. The dashboard panel (`ClarityPanel`)
surfaces a warning banner whenever bot sessions are ≥50% of total, similar in spirit to a
GA4 spam-traffic finding seen on another project — don't take the raw session count at face
value without checking this first.

Stored in `clarity_snapshots` (Section 5.14), same "patch today's row" pattern as
`ga4_snapshots`. Displayed in a "Content Performance (Clarity)" card on `/dashboard`
(admin/head-only "Sync Clarity" button), and included in the weekly cron
(`/api/cron/weekly-snapshot`) alongside GSC/Ahrefs/GA4 — the spec's original "pull monthly"
suggestion is superseded by folding it into the existing weekly cron for simplicity, which
if anything gives fresher (if still only 3-day-window) data than a monthly pull would.

**Fallback (not needed — API access works):** embedding the Clarity dashboard in an
`<iframe>` was the originally planned fallback if the API didn't return enough; it wasn't
needed since the API above works.

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

**Layout:** Header (quarter label, target date, last sync, Sync button) always visible, then
a tabbed body (`DashboardTabs`, client-side state — no route change, instant switching)
added 29 Aug 2026: **Targets** (the 12 stat tiles), **Trends** (the three line/bar charts),
**Competitor Comparison**, **Web Analytics (GA4)**, **Clarity**.

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

**Charts section (implemented 29 Aug 2026, `components/dashboard/charts/`, Recharts):**
1. Traffic trend (line chart) — Global and US organic traffic over all snapshots, with
   dashed current-quarter target reference lines. `TrafficTrendChart`.
2. Domain Rating progression (line chart) — actual over all snapshots vs. a dashed
   current-quarter target reference line. `DomainRatingChart`.
3. Keywords distribution (bar chart) — **Top 3 and Positions 4–10 only**, from the latest
   snapshot. `KeywordsDistributionChart`. Positions 11–20 are **not tracked** — neither the
   Ahrefs sync (`lib/ahrefs/client.ts`) nor the schema captures that band, so it was left out
   rather than fabricated; adding it would need a new Ahrefs call and a schema column.
4. Competitor comparison (horizontal bar chart) — EA vs. all active competitors, one chart
   each for DR / Organic Traffic / Organic Keywords (never combined into one dual-axis
   chart — the scales differ too much). `CompetitorMetricBarChart`, EA highlighted in blue,
   competitors in muted gray.

Colors use the validated categorical palette's first two slots (blue `#2a78d6` / orange
`#eb6834`) — validated via the dataviz skill's `validate_palette.js`, all checks pass. Light
mode only; **this app has no dark mode**, so no dark palette variant was built.

**Header:** Show active quarter label (e.g. "Q1 — Target date: 30 Sep 2026"), countdown to next quarter-end, and last sync timestamp.

**Sync button:** Visible to `admin` and `head` only. Triggers `/api/sync/ahrefs` manually.

---

### 8.3 Task Tracker (`/tasks`)

**Purpose:** A live task board over the current action register — originally the 34-action
register from Section 11.1, replaced 1 Sep 2026 by the September production sprint (Section
10.2).

**Add/Edit/Delete (admin only — implemented 28 Aug 2026, field list updated 2 Sep 2026 for the
ownership rebuild, Section 14 Phase 2):** a "New Task" button and per-row Edit/Delete actions
appear only for `role = 'admin'` — distinct from the owner/assignee status editing described
below. `POST /api/tasks` creates; `PATCH /api/tasks/[id]` accepts
`action_number`/`title`/`description`/`position_responsible`/`owner_id`/`due_date`/`quarter`/
`category_id`/`link_url`/`repeats`/`next_due`/`linked_finding_id`/`linked_keyword_id`
only when the caller is admin (non-admins get 403 if they send any of those fields);
`assigned_to_id`/`deadline`/`status`/`notes` follow the owner/assignee rule below instead —
admins can set those too, but so can whoever currently holds the task.
`DELETE /api/tasks/[id]` is admin-only (hard delete — `tasks` has no `is_active` column).
RLS: `tasks_delete_admin` (migration `0008`) backs the delete path for defense-in-depth,
though the route itself uses the service-role client.

**Views:** List view (Kanban view was never built).

**Filters (always visible, updated 2 Sep 2026, Section 14 Phase 3):**
- ~~My tasks only / All tasks~~ removed — non-admins are always hard-scoped server-side to
  tasks where they're Owner or Assigned To; only admins get a by-owner ("All owners") filter
- By quarter (Q1, Q2, Q3, Q4 — bare calendar-quarter labels, Section 14 Phase 1)
- By status
- By category (dropdown, populated from `task_categories` — was free text before this phase,
  and didn't even have a Task Tracker filter until now)
- By assigned owner (admin only)
- Overdue only
- Persist automatically per browser (`localStorage`, not synced across devices) until
  "Clear Filters" is pressed

**Task No — implemented 2 Sep 2026 (Section 14 Phase 3), replaces the "Action" column.** Plain
sequential numbers (01, 02, 03…), **never stored** — live-computed on every render from
whichever tasks are currently visible (post-search, post-filter), ranked by effective due date
ascending (soonest = 01; undated tasks sort last). `action_number` (the sprint-sheet codes like
S1/L1/A16-W1) is unchanged in the schema and still shown, just demoted to a small muted tag
next to the title instead of being the primary leftmost column.

**Overview stat deck — implemented 2 Sep 2026 (Section 14 Phase 3).** Four tiles above the
table: Pending / In-Progress / On-Hold / Completed counts, computed from the current
server-filtered task set (not affected by the client-only search box).

**Task card shows:**
- Task No (see above) plus the `action_number` tag
- Title
- Owner name + avatar
- Assigned To name (added 2 Sep 2026, replaces Co-owner — Section 14 Phase 2)
- Due date — red if overdue, 🚩 red-flagged if within 3 days and not yet overdue
- Status badge
- Description (collapsed by default, expand on click)

**Task detail panel — implemented 2 Sep 2026 (`TaskDetailPanel`, CLAUDE.md Section 14 Phase
3).** A right-anchored slide-in panel, 50% of the viewport width (the one deliberate exception
to the 80%-width rule the rest of the app's popups got in this same phase — built directly on
`components/ui/sheet.tsx`'s `Sheet`/`SheetContent side="right"`, not the shared `Dialog`),
scrollable, opening when a task row is clicked (anywhere except the row's checkbox or its
inline status `<select>`, which stop propagation). Replaces the separate History and Comments
buttons/dialogs, and Edit/Delete, entirely — nothing about a task lives outside this panel
once it's open except the row's own quick-access status dropdown. Layout top to bottom:
Status + (non-admin) a lightweight Reassign box → Details (admin: full editable
`TaskFields`/`Save`/`Delete task`; everyone else: read-only field summary) → Notes → Comments
→ Activity History (Comments-above-History was Abdullah's explicit ordering call).
`TaskFormDialog` (`components/tasks/task-form-dialog.tsx`) is creation-only now — editing an
existing task moved entirely into this panel, sharing its field-rendering with the New Task
dialog via the extracted `TaskFields` component (`components/tasks/task-fields.tsx`).
Non-admin reassignment (Owner/Assigned-To handoff) uses the same panel section that Phase 2's
interim `TaskReassignDialog` covered — that component is now deleted, absorbed here.

**Activity log — implemented 29 Aug 2026 (`task_activity` table, Section 5.15), moved into the
task detail panel's "Activity History" section 2 Sep 2026 (the standalone `TaskHistoryDialog`
button is gone, absorbed above).** Lists every recorded change to a task — who changed which
field, old value → new value, when. `computeTaskActivityEntries` (`lib/tasks/activity.ts`,
unit-tested) diffs the PATCH payload against the task's current row inside
`app/api/tasks/[id]/route.ts`, and one `task_activity` row is inserted per changed field.
This supersedes `tasks.updated_by`/`updated_at` (migration 0005), which only ever recorded
the *most recent* change — those columns are unchanged and still used elsewhere, this is
additive.

**Overdue logic (changed 2 Sep 2026, Section 14 Phase 2) + Red flag (added Phase 3):**
`overdue` is no longer a stored status — the daily cron (`/api/cron/daily-overdue`,
implemented 29 Aug 2026, persisted this to `tasks.status`) is **removed** (route deleted,
`vercel.json` cron entry removed) since the 4-value status enum has no `overdue` value to
write. It's back to being computed live — `due_date < today AND status != 'completed'` — same
as before 29 Aug 2026. On top of that, the Tasks table now shows a 🚩 red-flag indicator
(distinct from the overdue-red Due-date text) for any not-yet-overdue, not-completed task
whose effective due date is within 3 days.

**Ownership/permissions model rebuilt 2 Sep 2026 (Section 14 Phase 2) — supersedes the
"Approval workflow" section below, which is now historical only:**
- **Owner** (renamed from the old "Assigned to" field) — the person permanently accountable
  for a task's outcome, restricted at the app layer to exactly Tabish Khalid / Syed Ali /
  Najma Furqan (`lib/tasks/constants.ts`'s `ELIGIBLE_OWNER_NAMES`; admin-only to set, via
  `TaskFormDialog`). Only the Owner can set a task's status to `completed`.
- **Assigned To** (new field, `assigned_to_id`) — whoever's doing the hands-on work right now.
  Open to any profile, including `leadership`-role people, who are otherwise read-only
  everywhere else in the app (Section 4) — being Assigned To on a task is a per-task carve-out,
  the same kind of exception the old approver role had. Can move a task's status among
  `pending`/`in_progress`/`on_hold` but not to `completed`.
- **Deadline** (new field) — set whenever a task is handed to a new Assigned To; must never be
  later than Due date (validated client-side, server-side, and by a DB CHECK constraint).
- Reassignment (changing `assigned_to_id` + `deadline`) is available to whoever currently
  holds the task (its Owner or its current Assigned To) or admin/head — not admin-only, since
  handing a task on to the next person is the core workflow this model exists for. A minimal
  `TaskReassignDialog` covers this for Phase 2; Phase 3's slide-in task panel replaces it.
- `lib/tasks/permissions.ts`'s `getAllowedStatuses`/`canEditTaskStatus` (unit-tested) is the
  single source of truth for both the API's write-time validation
  (`app/api/tasks/[id]/route.ts`) and which options `TaskStatusSelect` offers.
- Existing data migration (`0024_task_ownership_rebuild.sql`): owners Talha Azeem/Hameed
  Ishaq/Usman Ali → reassigned to Tabish Khalid; Lavi Shamoon → reassigned to Najma Furqan;
  Tabish/Najma/Syed Ali keep their own tasks. Each reassigned task's original owner (or its
  co-owner, if one was set — co-owner takes priority) becomes its initial Assigned To, so
  their involvement isn't silently dropped.

**Permissions (current):**
- Task's Owner: full control over that task's status (including `completed`) and notes
- Task's current Assigned To (any role): status among `pending`/`in_progress`/`on_hold` and
  notes, plus reassigning the task onward
- `head` and `admin`: can edit all fields on all tasks
- `leadership`: read-only, except when they are a task's current Assigned To (see above)

**Approval workflow — implemented 1 Sep 2026 (`Staff Docs/approval_mockup.html`), removed 2
Sep 2026 (Section 14 Phase 2). Historical record only — `approver_id` and the
`submitted_for_review`/`changes_requested` statuses no longer exist.** Optional,
opt-in per task via the new `approver_id` field (admin-only to set, via `TaskFormDialog`) —
leaving it blank on a task keeps today's behaviour exactly as-is (owner can self-complete
directly). Once set:
- The task's owner (`assigned_to`/`co_assigned_to`) can no longer self-complete — their
  ceiling becomes `submitted_for_review`.
- The designated approver (whoever `profile.id === task.approver_id`, regardless of their
  own role) can, only while the task is `submitted_for_review`, either **Approve** (writes
  `status = 'completed'` directly — there is no separate persisted `'approved'` status) or
  **Request changes** (writes `status = 'changes_requested'`, with a mandatory reason logged
  to `task_activity` as a `change_request_reason` entry, visible in the History dialog). The
  owner then moves it back to `in_progress` themselves once addressed.
- The Tasks table shows a new Approver column and an amber "Nd awaiting approval" badge
  (computed live from `updated_at`, not a stored field) while `submitted_for_review`.
- Two new notification-bell types (`lib/notifications.ts`): "awaiting your approval" (to the
  approver) and "changes requested" (to the doer). Both removed 2 Sep 2026.

**Comments — implemented 2 Sep 2026 (`Staff Docs/further_recs_mockup.html` #1,
`task_comments` table, Section 5.16), moved into the task detail panel's "Comments" section
same day (the standalone "Comments" button/`TaskCommentsDialog` is gone, absorbed above) —
distinct from the pre-existing but UI-less `tasks.notes` field, which is unchanged and
untouched by this. Anyone `admin`/`head`/`owner` can post on any task (matching the team-wide
task visibility in Section 4); `leadership` can read but not post. Posting triggers a new
`new-comment` notification-bell entry to the task's Owner and current Assigned To (excluding
the commenter; updated 2 Sep 2026 for the ownership rebuild, Section 14 Phase 2 — previously
owner/co-owner/approver) — message deliberately doesn't name the commenter, matching how the
existing `status-changed` notification also omits who made the change.

**Comments become editable/deletable, plus @ mentions — implemented 2 Sep 2026 (Section 14
Phase 3, migration `0025_task_comments_edit_delete.sql`).** A change from the append-only
design above: the comment's own author can edit it (`edited_at` set, shown as "(edited)") or
soft-delete it (`deleted_at` set — the row stays, rendered as "[comment deleted]" so a thread
someone else is mid-read of doesn't silently renumber); admin can also delete (not edit)
anyone's comment for moderation. `app/api/tasks/[id]/comments/[commentId]/route.ts` (PATCH,
DELETE) backs this. Typing `@Name` in the comment box offers a simple suggestion dropdown
(matches on `full_name` prefix from the point after the last `@` in the current draft — not
full cursor-position-aware, a deliberate simplification for a 9-person tool) and mentioning
someone fires a new `mentioned` notification-bell type, independent of `new-comment` — it
fires for the mentioned person regardless of whether they're attached to that task at all
(`lib/notifications.ts`'s `getNotificationsForUser` now takes the viewer's own `full_name` and
checks recent comments app-wide for an `@` + that name substring).

**Link to review — implemented 2 Sep 2026 (`Staff Docs/further_recs_mockup.html` #2,
`tasks.link_url`).** A single URL field, admin-only to set (creation via `TaskFormDialog`,
editing via the task detail panel's Details section since Phase 3), shown as a
🔗 link next to the task title. Link-only, no file upload — there's no Supabase Storage
bucket in this project, and a URL covers the mockup's "link to the live page / doc /
screenshot" case without new infrastructure.

**Recurrence — implemented 2 Sep 2026 (`Staff Docs/further_recs_mockup.html` #3,
`tasks.repeats`/`tasks.next_due`).** `repeats` is a freeform cadence label (e.g. "Weekly, on
Friday"); `next_due` is the actual comparable date. Once `next_due` is set on a task, it
stands in for `due_date` everywhere overdue-ness is computed — the Tasks table's Due column
and `lib/notifications.ts`'s overdue/deadline-soon logic (the daily-overdue cron this used to
also feed was removed 2 Sep 2026, Section 14 Phase 2 — overdue-ness is live-computed only now)
— so a recurring task (the kind of thing the old "Recurring" A34 register entry could never be
flagged late for) becomes overdue-capable. As of this session's task-data reload (Section
10.2) no task in the live register currently uses this — it's available for whenever a
recurring task like weekly reviews gets added.

**Bulk actions — implemented 2 Sep 2026 (`Staff Docs/further_recs_mockup.html` #4,
`app/api/tasks/bulk/route.ts`).** Row checkboxes + a toolbar appear once at least one task is
selected: **Reassign to** (admin-only; sets `assigned_to_id` — updated 2 Sep 2026 for the
ownership rebuild, Section 14 Phase 2, since Owner is no longer a freely bulk-reassignable
field), **Set status to** (`admin`/`head`/`owner`; reuses `lib/tasks/permissions.ts`'s
`getAllowedStatuses` per row server-side, silently skipping rows the caller isn't allowed to
change and reporting a skip count), and **Export CSV** (client-side, available to everyone,
no server round-trip).

**Task linking — implemented 2 Sep 2026 (`Staff Docs/further_recs_mockup.html` #5,
`tasks.linked_finding_id`/`tasks.linked_keyword_id`).** This is what would have caught the
real A12-vs-finding mismatch (task marked completed, its linked Audit Reports finding still
open) at the source. Admin-only to set (creation via `TaskFormDialog`, editing via the task
detail panel since Phase 3), via dropdowns of `audit_reports`/`tracked_keywords`. A linked
finding shows both ways: as a badge on the task row, and as an
"↳ Linked task: A12 · status" badge on the finding's `AuditCard` (Section 8.7). When a task
with a `linked_finding_id` is moved to `completed`, `TaskStatusSelect` shows a confirm dialog
— "Also mark that finding resolved?" — and on confirmation `app/api/tasks/[id]/route.ts`
updates the linked `audit_reports` row to `status = 'resolved'` in the same request (opt-in
via `resolve_linked_finding` in the PATCH body, not automatic). Keyword linking has no
equivalent auto-resolve (`tracked_keywords` has no status field) — it's link-only, for
visibility.

**Q1 highlight:** Tasks in the current sprint (all due by 30 Sep 2026) should be visually
distinguished — prominent "Q1 Sprint" banner or colour strip. (Originally scoped to A1–A22;
since 1 Sep 2026 the whole 92-task September sprint fills this window — see Section 10.2.)

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

**Additional scorecard row:** "Sprint actions completed on time" — manually toggled by Tabish
(head role). Shows N/92 or actual count against the current September sprint (Section 10.2;
originally scoped to A1–A22 out of 34).

**Export button — implemented 29 Aug 2026:** Admin/head only. **CSV** is a real client-side
download (`lib/scorecard.ts`'s `scorecardRowsToCsv`, unit-tested, triggered via a Blob +
`<a download>`). **PDF** is the browser's native print dialog (`window.print()`) rather than
a new PDF-generation dependency — `print:hidden` utility classes hide the sidebar, topbar,
and page controls (`app/(dashboard)/layout.tsx`, `scorecard/page.tsx`) so only the title and
table print; the user picks "Save as PDF" as the print destination. `lib/scorecard.ts`'s
`buildScorecardRows` is also what `ScorecardTable` itself renders from, so the exported data
and the on-screen table can't drift apart.

**Notes field per row:** Allows Tabish or Abdullah to add a written reason for any amber/red metric (e.g. "Disavow reprocessing still pending — expected to clear in December").

---

### 8.5 Competitor Tracker (`/competitors`)

**Purpose:** Live comparison of EA vs. all tracked competitor domains.

**Table view:** One row per competitor, columns: Rank, Company, Domain, DR, Traffic/mo, Keywords, #1–3 Keywords, Est. Value, Ref. Domains, Last Synced.

- Sortable by any column
- EA's row always pinned and highlighted. **Implemented** (`lib/competitors.ts`'s `compareToEA`)
  — EA's latest `metric_snapshots` row renders as a highlighted first row, and each
  competitor's cell shows a ▲/▼ + % delta **from EA's perspective**, not the competitor's: a
  competitor ahead of EA on a metric shows red/▼ (EA is behind), and one EA beats shows
  green/▲ (EA is ahead). Fixed 29 Aug 2026 — the first version had this inverted (showed the
  competitor's own gain/loss, so a competitor far ahead of EA read as a green "win").
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

**Linked tasks — implemented 2 Sep 2026 (Section 8.3's task linking).** A finding with one or
more tasks pointing to it via `tasks.linked_finding_id` shows an "↳ Linked task: A12 · status"
badge per linked task. Approving/completing a linked task offers to resolve the finding in
the same step (Section 8.3) — this is what closes the loop `AuditCard` alone can't.

---

### 8.8 Weekly Report (`/weekly-report`)

**Implemented 29 Aug 2026.** `lib/weekly-report.ts`.

**Purpose:** Automated weekly snapshot for Talha Azeem and Syed Ali (mentioned in Addendum B.8 — "Give Talha and Syed Ali weekly visibility rather than quarterly").

**Content of weekly report:**
- Current vs. target for all 12 KPIs (`buildKpiList` — reuses `lib/rag.ts`'s RAG thresholds)
- Tasks due in the next 7 days (with owner name)
- Tasks overdue (with owner name)
- Metrics that changed since the previous `metric_snapshots` row (`buildMetricsMoved` —
  compares against whatever the second-most-recent snapshot is, which is only exactly "last
  week" if a sync happened to run then; unchanged metrics are omitted, not shown as 0%)
- Top 5 keyword risers and top 5 fallers by position change (`buildKeywordMovers`, from
  `tracked_keywords.current_position`/`previous_position` — same fields the GSC sync writes)

**Known gap:** `metric_snapshots` (used for the KPI section) is only refreshed by the manual
"Sync Ahrefs data" button, **not** by the weekly cron — so unless someone also runs an
Ahrefs sync, the KPI section can be reporting a stale snapshot. Not fixed as part of this
feature; would need `lib/ahrefs/client.ts`'s main-domain fetch extracted into a reusable
sync function the same way `lib/gsc/sync.ts`/`lib/ga4/sync.ts` already are.

**Generation:** Auto-generated every Monday at 9 AM PKT (04:00 UTC) — folded into the
existing `/api/cron/weekly-snapshot` cron (same schedule) rather than a second Vercel Cron
entry, since it reads the very data that cron just refreshed. Stored in `weekly_reports`
(one row per Monday-Sunday week, patch-if-regenerated-same-week). Viewable in-app by all
users, linked from the sidebar. `recipient_ids` is populated with Talha Azeem's and Syed
Ali's profile IDs (looked up by name) for when email notification is built.

**Email notification: not built** — the spec marks this optional (Supabase Edge Functions +
Resend or similar); `recipient_ids` is ready for it but no email is sent yet.

**Manual trigger:** `POST /api/weekly-report/generate`, admin only, "Generate Report" button
on the page.

---

### 8.9 Admin Panel (`/admin`)

Accessible only to `admin` role (Abdullah Shekha).

**Sub-pages:**
- `/admin/users` — Create, edit, deactivate user accounts. Set role. Cannot delete (soft deactivate only). **Implemented.**
- `/admin/sync` — Trigger manual Ahrefs sync (also triggerable from `/dashboard`), view `sync_logs`. **Implemented for Ahrefs.** GSC keyword-refresh, GA4 sync, and Clarity sync are all also implemented, but all three trigger elsewhere: GSC's button is on `/keywords` (Section 8.6), GA4's and Clarity's are on `/dashboard` (Section 8.2).
- `/admin/metrics` — Manually enter or correct a quarterly metric snapshot. Required for "quality referring domains" (this requires manual census, not API). **Implemented** — patches the existing same-day snapshot rather than inserting a duplicate, so it merges with whatever the day's Ahrefs sync already wrote.
- `/admin/settings` — Ahrefs target domain (used by `/api/sync/ahrefs`), plus GSC site URL / GA4 property ID (both now actually used — Section 7.2/7.3). **Implemented**, except quarter start/end dates, which intentionally stay in `lib/constants.ts` (Section 9.3) and are shown read-only here.
- `/admin/lead-sources` — Manages the extensible lead-source list used by the Leads Kanban board (Section 8.10): add a source, deactivate one, and toggle whether it requires the Submission From field. **Implemented.**

Admin sub-pages render as tabs under a shared `app/(dashboard)/admin/layout.tsx` (`/admin`
redirects to `/admin/users`) rather than as separate unlinked pages.

**Weekly automation:** `GET /api/cron/weekly-snapshot`, scheduled every Monday 04:00 UTC
(09:00 PKT — matches the `weekly_reports` cadence in Section 8.8) via `vercel.json`'s
`crons` config. Authenticated by `CRON_SECRET` (a Vercel Cron job has no logged-in user, so
this doesn't go through `getCurrentProfile()` like every other sync route). Runs the same
GSC sync (`lib/gsc/sync.ts`), competitor Ahrefs sync (`lib/ahrefs/competitorSync.ts`), GA4
sync (`lib/ga4/sync.ts`), and Clarity sync (`lib/clarity/sync.ts`) logic the manual buttons
use, then additionally writes one `competitor_snapshots` row per active competitor. Logs to
`sync_logs` with `source: 'weekly-cron'` and `triggered_by: null`.

---

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
**Implemented 29 Aug 2026, removed 2 Sep 2026 (Section 14 Phase 2).** Was `GET
/api/cron/daily-overdue`, scheduled daily at 00:05 UTC via `vercel.json`,
`CRON_SECRET`-authenticated (same pattern as the weekly cron), setting `status = 'overdue'` on
any task past its due date and not completed. Removed along with the `overdue` status value
itself (the 4-value status enum has no stored `overdue`) — route deleted, `vercel.json` cron
entry removed. Overdue-ness is computed live wherever it's needed (`due_date < today AND
status != 'completed'`), same as before this feature existed; Phase 3 adds a visual "red flag"
for anything within 3 days of Due.

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

### 10.2 September Sprint (`tasks` seed)

**Fully superseded 1 Sep 2026.** The entire `tasks` table (both the original 34-action
strategy-doc register and the 43 tasks, `A35`–`A77`, added 28 Aug 2026 from
`Documents from SEO Team/EA_SEO_Team_Action_Tracker_Updated.xlsx` for 6 team members) was
deleted and replaced with a 92-task, 5-week production sprint sourced from
`Staff Docs/All tasks sheet.xlsx` (migration `0014_task_sept_sprint_reload.sql`). None of the
action numbering below (A1–A77) is live anymore — it's kept only as history for anyone
tracing older activity-log entries or reports.

The current register runs 1 Sep – 30 Sep 2026 across 5 weekly blocks (due dates: Fri 4/11/18/25
Sep, Wed 30 Sep), organized by `category` (added in migration `0013_task_category.sql`, not
present in the original schema): Service Pages, Location Pages, New Blogs, Blog Revamp,
Proofreading, Publishing, Design / Images, Technical SEO, Website, Links, Off-Page SEO.
`action_number` follows the sheet's own short codes (`S1`–`S18`, `L1`–`L4`, `B1`–`B8`,
`R1`–`R10`, `P1`–`P8`, `PB1`–`PB8`, `D1`–`D8`, `DR1`–`DR10`, `T1`–`T5`, `W1`–`W4`, `O1`–`O4`),
except the recurring "Claim software partner directories" task, which the sheet lists
identically in all 5 weeks under the code `A16` — disambiguated here as `A16-W1`…`A16-W5` so
each week's row stays unique. All 92 rows carry `quarter = 'Q1'` (the whole sprint sits inside
the Q1 window) and `status = 'pending'` at seed time. See `supabase/seed.sql` for the full
per-task list (owner, due date, description, notes).

**Historical: the original 34-action register (superseded 1 Sep 2026):**

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

**5. Google auth must cover both GSC and GA4.** A single Google service account (`GOOGLE_SERVICE_ACCOUNT_EMAIL` / `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`) covers both, added as a user on the GSC property and a Viewer on the GA4 property — not the OAuth refresh-token flow this note originally described (see Section 7.2's Auth note). `lib/google/auth.ts` mints scoped access tokens on demand; GA4 (Section 7.3, implemented 29 Aug 2026) reuses this same module rather than a parallel auth path, as planned.

**6. Microsoft Clarity API turned out not to be limited — implemented 29 Aug 2026.** The
programmatic API (Section 7.4) returns everything needed (sessions, bot detection, dead/rage
clicks, scroll depth, top pages); the originally-planned `<iframe>` embed fallback was never
needed. The one real limitation is `numOfDays` being capped at 3 on the current plan — see
Section 7.4.

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

Everything in Section 8 beyond this list was originally v2 scope. As of 29 Aug 2026, all of
it is built except the weekly report's email notification (see Section 14) — GA4, Clarity,
dashboard charts, the weekly report page, the task activity log, the daily overdue cron, and
scorecard CSV/PDF export are all live.

## 14. Implementation Status (as of 29 Aug 2026)

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
  notifications (`lib/notifications.ts`). **Updated 2 Sep 2026:** clickable (jumps to and
  highlights the task on `/tasks`), full per-item read/unread + "Mark all as read"
  (`notification_reads` table, migration `0020`) — see the dedicated changelog entry below.
- Weekly `competitor_snapshots` history + automated Monday cron for both GSC keywords and
  competitors (Section 8.9's "Weekly automation").
- Quarterly Target values moved from a hardcoded constant to an admin-editable
  `quarterly_targets` table, editable via `/scorecard/edit` (Section 8.4/10.3).
- Live tasks/competitors/keywords data replaced from the SEO team's updated planning
  documents (Section 10.2/12 notes 1-2) — 58 tasks, 8 competitors, 96 keywords as of import.
- **1 Sep 2026:** `tasks` fully replaced again — all 58 prior tasks deleted, reloaded with the
  92-task, 5-week September production sprint from `Staff Docs/All tasks sheet.xlsx`, plus a
  new `category` column (migrations `0013_task_category.sql`,
  `0014_task_sept_sprint_reload.sql`). See Section 10.2.
- **1 Sep 2026:** Task approval workflow (`Staff Docs/approval_mockup.html`) — optional
  `approver_id` field, 2 new statuses (`submitted_for_review`, `changes_requested`), and a
  permission model in `lib/tasks/permissions.ts` (migration `0015_task_approval.sql`). See
  Section 8.3.
- **2 Sep 2026:** Threaded task comments (`Staff Docs/further_recs_mockup.html` #1) — new
  `task_comments` table (migration `0016_task_comments.sql`), `TaskCommentsDialog`, and a
  `new-comment` notification type. See Section 8.3.
- **2 Sep 2026:** Remaining `further_recs_mockup.html` items #2–#5 — link-to-review field
  (`tasks.link_url`, migration `0017`), recurrence (`tasks.repeats`/`next_due`, migration
  `0018`, wired into overdue logic everywhere it's computed), bulk actions
  (`app/api/tasks/bulk/route.ts`: reassign, set-status, export CSV), and task linking to
  Audit findings/keywords (`tasks.linked_finding_id`/`linked_keyword_id`, migration `0019`,
  with a resolve-finding-too prompt on task completion). See Section 8.3 and 8.7.
- **2 Sep 2026:** Notification bell fixes reported by Abdullah — (1) notifications weren't
  clickable, (2) no way to mark read/unread or bring the unread count down, (3) other users'
  changes (e.g. a task status edit) needed a manual page refresh to show up anywhere in the
  app. Fixed together:
  - **Clickable + read/unread** (`notification_reads` table, migration `0020`,
    `app/api/notifications/mark/route.ts`): clicking a notification jumps to `/tasks` and
    scrolls to + briefly highlights that row (`?highlight=<taskId>`), marking it read.
    Notifications are computed live, not stored rows (`lib/notifications.ts`), so each one now
    carries a `key` stable per *instance* (e.g. `status-changed` keys on `updated_at`, so
    reading one change doesn't suppress the next) — read state is tracked against that key,
    not the notification itself. Per-item mark read/unread toggle plus "Mark all as read".
  - **Live sync** (`components/layout/realtime-refresh.tsx`, migration
    `0021_realtime_publication.sql`): Supabase Realtime, not polling — explicitly requested;
    the WebSocket connection is from the browser directly to Supabase's managed Realtime
    service, not something this app's own Vercel functions host. One subscription in the
    dashboard layout watches every shared table (tasks, task_activity, task_comments,
    competitors, tracked_keywords, keyword_history, audit_reports, metric_snapshots,
    ga4_snapshots, clarity_snapshots) and debounce-refreshes the current route on any change;
    the bell has its own smaller subscription (tasks, task_comments) so the unread count stays
    current even with the dropdown closed.
- **2 Sep 2026, fix:** read/unread state reset to all-unread on page reload. Root cause:
  `app/api/notifications/mark/route.ts`'s `.upsert()` calls omitted `ignoreDuplicates`, so they
  compiled to `INSERT ... ON CONFLICT DO UPDATE` — Postgres requires RLS UPDATE permission to
  even plan that statement, regardless of whether a row actually conflicts at runtime, and
  `notification_reads` (migration 0020) only grants/policies select/insert/delete. Every
  mark-as-read write was failing server-side; the client never checked the response, so the
  optimistic local UI update masked it during the session, and a reload revealed the real
  (never-written) state. Fixed by passing `ignoreDuplicates: true` (`ON CONFLICT DO NOTHING`,
  which needs no UPDATE permission — we never need to change an existing read row, just ensure
  it exists) — no migration needed. `NotificationBell` also now checks the response and
  reverts the optimistic update on failure, so a future write failure is visible instead of
  silently invisible the way this one was.
- Task add/edit/delete (admin only, Section 8.3) and search + sortable columns on
  Tasks/Keywords/Competitors tables.
- Dashboard charts (Section 8.2) — traffic trend, DR progression, keywords distribution,
  competitor comparison bars, using Recharts and the validated categorical palette.
- GA4 integration (Section 7.3) — service-account auth reused from GSC, "Website Analytics
  (GA4)" card on `/dashboard`, manual sync button, and included in the weekly cron.
- Microsoft Clarity integration (Section 7.4) — "Content Performance (Clarity)" card on
  `/dashboard`, with a bot-traffic warning banner (96% of live sessions were bot-flagged at
  time of testing). API access confirmed working; the originally-documented base URL was
  wrong (corrected in Section 7.4), same class of issue as the earlier GSC `/v1` mistake.
- Dashboard reorganized into tabs (Section 8.2) — Targets / Trends / Competitor Comparison /
  Web Analytics (GA4) / Clarity — client-side, no route change.
- Weekly report (Section 8.8) — `/weekly-report`, generated by both the weekly cron and an
  admin-only manual trigger. Email notification still not built (spec marks it optional).
- Task activity log (Section 8.3) — new `task_activity` table, one row per changed field,
  viewable via a "History" button on every task row (all roles).
- ~~Daily overdue auto-update~~ (Section 9.2) — implemented 29 Aug 2026, **removed 2 Sep 2026**
  along with the `overdue` status value itself (Section 14 Phase 2); back to computed live.
- Scorecard CSV/PDF export (Section 8.4) — CSV is a real download; PDF is the browser's
  native print dialog with `print:hidden` chrome, not a new PDF-generation dependency.

**Session paused 1 Sep 2026 — resume here next session.** Working through
`Staff Docs/approval_mockup.html` and `Staff Docs/further_recs_mockup.html` as 7 sequential
sub-projects (task data migration first, since the other 6 build on top of it), each done via
the brainstorming skill's "bounded" flow (context → clarifying questions → short in-chat
design → approval → implement, no separate spec doc) rather than one combined design:
1. ✅ Task data migration (Section 10.2) — **done, migrations 0013/0014 confirmed applied by
   Abdullah via the Supabase SQL editor.**
2. ✅ Approval workflow (Section 8.3) — **done, migration `0015_task_approval.sql` confirmed
   applied by Abdullah (2 Sep 2026).**
3. ✅ Comments thread per task (`further_recs_mockup.html` #1) — **done, migration
   `0016_task_comments.sql` confirmed applied by Abdullah (2 Sep 2026).**
4. ✅ Attachment/link field per task (#2) — **done, migration `0017_task_link_url.sql`
   confirmed applied by Abdullah (2 Sep 2026).**
5. ✅ Explicit recurrence (`Repeats` + `Next due`) (#3) — **done, migration
   `0018_task_recurrence.sql` confirmed applied (2 Sep 2026).**
6. ✅ Bulk actions — reassign, set-status, export CSV (#4) — **done, no migration needed
   (no schema change).**
7. ✅ Link a task to an Audit finding / keyword, with a resolve-the-finding-too prompt on
   completion (#5) — **done, migration `0019_task_links.sql` confirmed applied (2 Sep
   2026).** This is the one that directly addresses the real A12-vs-finding mismatch bug the
   mockups were written to prevent.

**All 7 items from both mockups are now fully done — code and migrations both confirmed.**

**2 Sep 2026, follow-up fixes (notification bell + live sync) — done, migrations
`0020_notification_reads.sql` and `0021_realtime_publication.sql` confirmed applied by
Abdullah (2 Sep 2026).** If updates still aren't appearing without a refresh, double-check the
Realtime toggle is on for the project in the Supabase dashboard under Database → Replication
— the migration adds tables to the publication, but that's separate from the project-level
Realtime enable switch.

- **2 Sep 2026:** Leads List (Kanban) — new admin-only feature, unrelated to the SEO task
  tracker. See Section 8.10 and `docs/superpowers/specs/2026-09-02-leads-kanban-design.md`.

**Session paused 2 Sep 2026 (evening) — resume here next session. Nothing in this section is
implemented yet — planning/clarification only, all decisions below were confirmed with
Abdullah and are load-bearing (do not re-derive or guess differently).** This is a large body
of work — comparable to or larger than the entire Leads Kanban build — decomposed into 7
ordered phases, each to get its own design review (and likely its own spec + SDD-worktree
execution cycle, matching how Leads was built) before implementation starts:

**Phase 0 — ✅ done (2 Sep 2026).** Leads bug fixes (small, independent, do first):
- Delete-lead UI button (the `DELETE /api/leads/[id]` route already exists, just no button)
- `htmlFor`/`id` pairing on `lead-detail-dialog.tsx`'s form labels (screen-reader gap)
- Failed drag-and-drop PATCH currently reverts silently — add an error message
- `lead-detail-dialog.tsx`'s `source_id` field doesn't clear a stale `submission_from` when
  switching to a source that doesn't require it (mirrors an already-fixed bug in
  `new-lead-dialog.tsx` — apply the same fix, `setSourceId` helper pattern)

**Phase 1 — ✅ done (2 Sep 2026), migration `0023_calendar_quarter_boundaries.sql` still needs
manual application via the Supabase SQL editor.** Quarter boundaries overhaul ("most critical"
per Abdullah):
- Switch from "programme quarters" (counted up from kickoff) to **standard calendar quarters**
  that repeat every year: Q1=Jan-Mar, Q2=Apr-Jun, Q3=Jul-Sep, Q4=Oct-Dec — computed
  generically for any date, not a fixed hardcoded boundary list (`QUARTER_BOUNDARIES` in
  `lib/constants.ts` needs to become a formula, not an array Haroon manually extends).
  New concrete boundaries: **Q3 2026** = 24 Aug – 30 Sep 2026 (today's stub period),
  **Q4 2026** = 1 Oct – 31 Dec 2026, **Q1 2027** = 1 Jan – 31 Mar 2027, **Q2 2027** = 1 Apr –
  30 Jun 2027, **Q3 2027** = 1 Jul – 30 Sep 2027.
- `QUARTERLY_TARGETS`/`quarterly_targets` table: straight 1:1 relabel of existing numbers —
  today's Q1 → Q3-2026, Q2 → Q4-2026, Q3 → Q1-2027, Q4 → Q2-2027, Q5 → Q3-2027. Same target
  numbers, same order, just relabeled. Needs a **year column** added to `quarterly_targets`
  since "Q3" now legitimately occurs twice (2026 and 2027) with different targets.
- All 92 currently-imported tasks have `quarter = 'Q1'` — becomes `quarter = 'Q3'` (2026) under
  the new labels (straight relabel, not a re-derivation).
- Every place displaying/reading a quarter label needs updating: dashboard header countdown,
  scorecard quarter selector, weekly report, `getCurrentQuarter()`.

**Phase 2 — ✅ done (2 Sep 2026), migration `0024_task_ownership_rebuild.sql` still needs
manual application via the Supabase SQL editor.** Task ownership/workflow model rebuild
(foundational for Phase 3, itself as large as the whole Leads project). One deliberate
addition beyond the bullets below: since reassignment (Owner/Assigned To handoff) is now
usable by non-admins too, not just admins, Phase 2 shipped a minimal `TaskReassignDialog` (a
"Reassign" button next to History/Comments on rows the viewer can edit) so the feature works
end-to-end rather than being API-only until Phase 3's slide-in panel lands:
- **Remove Co-Owner entirely.** Existing `co_assigned_to` data seeds the initial new
  "Assigned To" value on migration (see below) — not just dropped.
- **Remove Approver entirely** — the whole approval workflow built 1 Sep 2026 (Section 8.3):
  `approver_id`, the `submitted_for_review`/`changes_requested` statuses, the Approve/
  Request-changes actions, and the two related notification types. Fully replaced by the new
  model below.
- **New two-tier ownership model:**
  - **Owner** (renames/redefines today's "Assigned to" field) — the person permanently
    accountable for a task's outcome. Can now ONLY be one of exactly 3 people: **Tabish
    Khalid, Syed Ali, Najma Furqan**. (This is the task-level field, NOT `profiles.role` —
    role stays as-is for everyone.)
  - **Assigned To** (new field) — whoever is currently doing the hands-on work. Selectable
    from literally every profile, including `leadership`-role people (Adeela, Haroon) — being
    Assigned To grants that person edit rights on that task (status/notes/reassignment)
    specifically, the same kind of carve-out the approver role had, even though `leadership`
    stays read-only everywhere else in the app. A dropdown of all staff plus a "Myself"
    convenience option (auto-resolves to the logged-in user).
  - Real-world flow (Abdullah's example): Tabish (owner) creates a task, assigns to Talha
    with a deadline for SEO research; Talha assigns to Najma for content writing; Najma
    assigns to Lavi (or keeps it herself) with her own deadline; Lavi assigns to Adeela for
    review; Adeela assigns back to Najma; Najma might route back to Tabish, who assigns to
    Hameed (Designer) then Usman (Web Developer). Each handoff should log to the existing
    `task_activity` mechanism (extend it to cover the new fields), same as every other
    tracked field change today.
  - Tasks must show for BOTH the Owner and the current Assigned-To person (not just the
    owner) when either of them is filtering/viewing "my tasks".
- **New `deadline` field**, distinct from the existing `due_date` — settable whenever a task
  is reassigned. **Deadline must never be later than Due date** (validation, both client and
  server-side).
- **Status enum cut from 7 down to exactly 4**: `pending`, `in_progress`, `on_hold`,
  `completed`. `overdue` stops being a stored status entirely — becomes a purely visual/
  computed red-flag instead (see Phase 3). Existing data remap: `blocked` → `on_hold`;
  `overdue` → whichever of `pending`/`in_progress` the task's real work state actually is (not
  a blanket single target); `submitted_for_review` → `in_progress`; `changes_requested` →
  `in_progress`.
- **Only the task's Owner (one of the 3) can set status to `completed`.** Whoever currently
  holds "Assigned To" can freely move it among `pending`/`in_progress`/`on_hold` themselves as
  they work.
- **Owner reassignment for existing tasks** (data migration, confirmed counts from
  `supabase/seed.sql` as of 2 Sep 2026): Talha Azeem (17 tasks) → Tabish; Hameed Ishaq (9) →
  Tabish; Lavi Shamoon (6) → Najma; **Usman Ali (9, not originally mentioned by Abdullah but
  confirmed) → Tabish** too, same pattern as Talha/Hameed. Tabish (27), Najma (5), and Syed
  Ali (2) keep their current tasks as Owner unchanged. The person being moved off Owner
  becomes the task's initial "Assigned To" instead (see Co-Owner note above for how the
  starting Assigned-To value gets picked when there's also existing co-owner data).
- **New `task_categories` table**, admin-CRUD (add/edit/delete), replacing free-text
  `tasks.category`. Auto-seed with the 11 values already in use: Service Pages, Location
  Pages, New Blogs, Blog Revamp, Proofreading, Publishing, Design / Images, Technical SEO,
  Website, Links, Off-Page SEO.

**Phase 3 — ✅ done (2 Sep 2026), migration `0025_task_comments_edit_delete.sql` still needs
manual application via the Supabase SQL editor.** Task Tracker UI overhaul (depended on Phase
2's data model):
- **Task No** replaces the "Action" column/`action_number` (S1/L1/B1/A16-W1/etc. codes) —
  plain sequential numbers (01, 02, 03…), **never stored**, live-computed on every view:
  **soonest due date = 01** (most urgent = lowest number), recalculated fresh from current
  due dates each render (naturally "updates" as due dates/deadlines change over a task's
  life, including via reassignment).
  - `action_number` itself: keep the underlying stored identifier or drop it? — **not yet
    decided, resolve when designing Phase 3** (Task No is explicitly a display-only
    computed rank, distinct from any stable stored identifier a task might still need).
- **Slide-in detail panel from the right, 50% screen width** (this is a Phase-3-specific
  override — Phase 3's *other* dialogs, and dialogs elsewhere in the app like Leads, get the
  general 80%-width rule below), scrollable, replaces the separate History and Comments
  dialogs/buttons entirely, and also absorbs Edit/Delete (no longer separate row buttons —
  everything about a task lives in this one panel once clicked open). Layout: **Comments
  section on top, Activity History section below.**
  - Comments become **editable/deletable by their own author** (admin can moderate any
    comment too) — a change from the current append-only design. Edited comments show an
    "(edited)" mark; deleted comments leave a "[comment deleted]" placeholder rather than
    vanishing.
  - **@ mention support in comments** — typing `@Name` should offer autocomplete over staff,
    and mentioning someone fires a new "you were mentioned" notification-bell type,
    independent of the existing "new comment" notification (which still goes to owner/
    assigned-to only).
- Clicking a task row opens this panel (exact interaction pattern — inline accordion vs. this
  slide-in panel — **resolved as the slide-in panel**, per Abdullah's explicit answer).
- **Category filter becomes a dropdown** (populated from the new `task_categories` table),
  not free text.
- **Overview stat deck** at the top of `/tasks`: counts of Pending / In-Progress / On-Hold /
  Completed.
- **Red flag indicator** for any task within 3 days of its Due date (visual only, ties into
  removing the stored `overdue` status from Phase 2).
- **Filters persist automatically per user** (survives navigation/reload) until they explicitly
  press "Clear Filters" — likely `localStorage`, matching this app's existing per-viewer-
  convenience pattern (not DB-synced across devices).
- **Remove the "All tasks" / "My tasks only" toggle.** Non-admins should just always see their
  own tasks (Owner or Assigned-To) by default with no toggle needed; **only admins get to
  additionally view/filter by "All owners"**.
- **Remove the "Q1 Sprint — …" banner** entirely.
- **All other popups app-wide (Leads create/detail dialogs, admin add/edit dialogs, etc.)
  widen to 80% of screen width** — the general rule Abdullah gave, distinct from the
  task-panel's own 50% spec above.

**Phase 4 — Admin panel enhancements:**
- Lead Sources: the Submission From **options themselves become admin-editable** (not the
  current hardcoded "Book A Consultation / Contact Form / Chat" enum) — needs a new child
  table (e.g. `lead_source_submission_options`, FK'd to `lead_sources`), and
  `leads.submission_from` changes from a fixed `check` constraint to an FK reference.
  Add real edit (name) and delete for Lead Sources themselves too (currently only
  create + activate/deactivate + toggle `requires_submission_from` exist).
- Users: add real edit (name/role/job title) and delete, admin-only. "Lock" = the existing
  `is_active` deactivate toggle, just exposed alongside proper edit/delete (not a new
  separate concept).
- (`task_categories` admin CRUD UI is part of Phase 4 even though the table itself is created
  in Phase 2.)

**Phase 5 — Scorecard enhancements:**
- "Edit Targets" restricted to **admin only** (currently broader).
- **Accountable Owner becomes admin-editable** — `ACCOUNTABILITY_MAP` (currently a hardcoded
  constant in `lib/constants.ts`) needs to move to a DB-backed, admin-editable table.
- Quarter filter selection **auto-saved per user** (same persistence approach as Task Tracker
  filters).
- **New auto-sync for Actual/Variance** on the 12 KPIs, fixed source priority (confirmed
  mapping): **GSC-sourced** — Organic Traffic Global/US, Organic Keywords Global/US, Keywords
  Top 3, Keywords Top 10, Indexed Content Pages. **GA4** — none of the 12 KPIs map cleanly
  (GA4 measures sessions/users, not organic-search rank data); stays informational-only on
  the dashboard, not a Scorecard sync source. **Ahrefs (fallback for the rest)** — Domain
  Rating, Traffic Value Monthly, Referring Domains Total, Avg Keywords per Page. Referring
  Domains Quality stays manual-only (existing rule, unchanged).
- **Sync features restricted to admins plus Najma Furqan and Tabish Khalid by name**
  (not role-based — Najma/Tabish are `role = 'owner'`, not `admin`).

**Phase 6 — Dashboard + Competitors weekly-snapshot scroll views:**
- New scrollable feed on `/dashboard`: one card per Monday snapshot (the weekly cron already
  captures this data), newest first, showing all 12 KPI values + week-over-week change.
- Same pattern on `/competitors`, per competitor.

**Known gaps (not yet built):**
- Scorecard's "Sprint actions completed on time" toggle (Section 8.4) — CSV/PDF export is
  done, this toggle is not.
- Weekly report's KPI section can go stale — `metric_snapshots` isn't refreshed by the
  weekly cron, only by the manual Ahrefs sync button (see Section 8.8's "Known gap").
- Weekly report email notification to Talha/Syed Ali — spec marks this optional, not built;
  would need a new third-party service (Resend or similar) and API key.
- A permission bug reported for task status editing (owners editing others' tasks) could not
  be reproduced against the current code or live data as of this session — the PATCH route
  and RLS both correctly scope `owner`-role edits to tasks the user is `assigned_to`/
  `co_assigned_to` on. Revisit with specific repro steps if it recurs.
- Mid-life reassignment doesn't notify the new assignee (`lib/notifications.ts`'s "assigned"
  notification only fires for a genuinely new task, via `created_at` recency) — doing this
  properly needs `task_activity` entries in `getNotificationsForUser`'s inputs, which it
  doesn't currently take.
- @ mention autocomplete (Section 8.3) matches on plain text after the last `@` in the
  comment draft, not true cursor position — a deliberate simplification, not a bug, but worth
  knowing if it ever feels wrong while typing mid-message.

---

*This document is the single source of truth for the EA SEO Tracker build. Update it as the project evolves.*
*Last updated: 29 August 2026 — Abdullah Shekha*
