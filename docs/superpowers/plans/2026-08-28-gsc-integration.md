# GSC Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an admin/head user refresh keyword rank positions on `/keywords` from live Google
Search Console data with one button click, using a Google service account (no OAuth consent
flow, no refresh-token expiry).

**Architecture:** A small chain of pure, independently-testable `lib/` modules — Google service
account auth → GSC API client → keyword-matching logic — wired together by a thin, untested
Route Handler (`app/api/sync/gsc/route.ts`) that follows the exact shape of the existing
`app/api/sync/ahrefs/route.ts`. No new database tables; `tracked_keywords` and `keyword_history`
already have the right columns. UI adds one button to `/keywords`, reusing a generalized version
of the existing `SyncButton`.

**Tech Stack:** Next.js 14 Route Handlers, `google-auth-library` (new dependency) for JWT service
account auth, native `fetch` for the GSC REST API (no `googleapis` SDK — matches the existing
Ahrefs client's raw-fetch style), Vitest for `lib/` unit tests, pnpm.

**Spec:** `docs/superpowers/specs/2026-08-28-gsc-integration-design.md`

## Global Constraints

- Node 20+, TypeScript strict mode on (CLAUDE.md Section 2).
- Package manager is pnpm — never use npm/yarn commands.
- `/api/sync/gsc` is admin/head only, same guard as `/api/sync/ahrefs` (CLAUDE.md Section 4,
  Section 8.9).
- No new database tables or migrations — reuse `tracked_keywords` and `keyword_history` as-is.
- Unmatched keywords (no GSC data in the lookback window) are left untouched — never null out or
  zero an existing `current_position`.
- Secrets (`GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`, `CLARITY_API_TOKEN`, etc.) live only in
  `.env.local` (gitignored) — never in a committed file, never printed in full in commit
  messages or code comments.
- Follow this codebase's existing test convention: only pure `lib/` logic is unit-tested
  (see `lib/ahrefs/client.test.ts`, `lib/rag.test.ts`); Route Handlers and React components are
  not unit-tested here, matching every existing sync route (`ahrefs`, `competitors`).
- `metric_snapshots` and any other "additive/historical" tables are out of scope for this
  plan — untouched.

---

## Task 1: Google service-account auth module

**Files:**
- Create: `lib/google/auth.ts`
- Test: `lib/google/auth.test.ts`
- Modify: `package.json` (add `google-auth-library` dependency)

**Interfaces:**
- Produces: `getGoogleAccessToken(scopes: string[]): Promise<string>` — later tasks call this
  with `['https://www.googleapis.com/auth/webmasters.readonly']`.

- [ ] **Step 1: Add the dependency**

Run: `pnpm add google-auth-library`

- [ ] **Step 2: Write the failing tests**

Create `lib/google/auth.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const getAccessTokenMock = vi.fn()
vi.mock('google-auth-library', () => ({
  JWT: vi.fn().mockImplementation(() => ({ getAccessToken: getAccessTokenMock })),
}))

import { getGoogleAccessToken } from './auth'

describe('getGoogleAccessToken', () => {
  const ORIGINAL_ENV = { ...process.env }

  beforeEach(() => {
    getAccessTokenMock.mockReset()
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = 'test@example.iam.gserviceaccount.com'
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY =
      '-----BEGIN PRIVATE KEY-----\\nabc123\\n-----END PRIVATE KEY-----\\n'
  })

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV }
  })

  it('returns the access token from the JWT client', async () => {
    getAccessTokenMock.mockResolvedValue({ token: 'fake-token' })
    const token = await getGoogleAccessToken(['https://www.googleapis.com/auth/webmasters.readonly'])
    expect(token).toBe('fake-token')
  })

  it('throws when GOOGLE_SERVICE_ACCOUNT_EMAIL is missing', async () => {
    delete process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
    await expect(getGoogleAccessToken(['some-other-scope'])).rejects.toThrow(
      /GOOGLE_SERVICE_ACCOUNT_EMAIL/
    )
  })

  it('throws when the JWT client returns no token', async () => {
    getAccessTokenMock.mockResolvedValue({ token: undefined })
    await expect(getGoogleAccessToken(['yet-another-scope'])).rejects.toThrow(
      /Failed to obtain Google access token/
    )
  })
})
```

Note: each test that doesn't expect success uses a distinct scope array so the module's
internal per-scope client cache (Step 4) can't accidentally reuse a client built in a different
test.

- [ ] **Step 3: Run tests to verify they fail**

Run: `pnpm test lib/google/auth.test.ts`
Expected: FAIL with "Cannot find module './auth'" (file doesn't exist yet).

- [ ] **Step 4: Write the implementation**

Create `lib/google/auth.ts`:

```ts
import { JWT } from 'google-auth-library'

const clients = new Map<string, JWT>()

function unescapePrivateKey(key: string): string {
  return key.replace(/\\n/g, '\n')
}

function getClient(scopes: string[]): JWT {
  const cacheKey = [...scopes].sort().join(',')
  const existing = clients.get(cacheKey)
  if (existing) return existing

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
  if (!email || !privateKey) {
    throw new Error(
      'GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY must both be set'
    )
  }

  const client = new JWT({ email, key: unescapePrivateKey(privateKey), scopes })
  clients.set(cacheKey, client)
  return client
}

// google-auth-library's JWT client caches its own token internally (keyed on its
// credentials' expiry_date) and only re-authenticates when the cached token is stale, so
// reusing one JWT client instance per scope-set (via the module-level cache above) is
// sufficient — no separate expiry-tracking needed here.
export async function getGoogleAccessToken(scopes: string[]): Promise<string> {
  const client = getClient(scopes)
  const { token } = await client.getAccessToken()
  if (!token) throw new Error('Failed to obtain Google access token')
  return token
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm test lib/google/auth.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml lib/google/auth.ts lib/google/auth.test.ts
git commit -m "feat: add Google service-account auth module for GSC/GA4"
```

---

## Task 2: GSC API client

**Files:**
- Create: `lib/gsc/client.ts`
- Test: `lib/gsc/client.test.ts`

**Interfaces:**
- Consumes: `getGoogleAccessToken(scopes: string[]): Promise<string>` from `lib/google/auth.ts`
  (Task 1).
- Produces:
  ```ts
  export interface GscQueryRow {
    query: string
    page: string
    position: number
    clicks: number
    impressions: number
    ctr: number
  }
  export async function fetchGscQueryPositions(siteUrl: string, days = 90): Promise<GscQueryRow[]>
  ```
  Task 3 imports `GscQueryRow`; Task 4 (route) imports `fetchGscQueryPositions`.

- [ ] **Step 1: Write the failing tests**

Create `lib/gsc/client.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/google/auth', () => ({
  getGoogleAccessToken: vi.fn().mockResolvedValue('fake-token'),
}))

import { fetchGscQueryPositions } from './client'

describe('fetchGscQueryPositions', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  it('parses rows from a successful GSC response', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        rows: [
          {
            keys: ['best cpa firm', 'https://expertiseaccelerated.com/'],
            clicks: 3,
            impressions: 50,
            ctr: 0.06,
            position: 8.4,
          },
        ],
      }),
    } as Response)

    const rows = await fetchGscQueryPositions('https://expertiseaccelerated.com/', 90)

    expect(rows).toEqual([
      {
        query: 'best cpa firm',
        page: 'https://expertiseaccelerated.com/',
        clicks: 3,
        impressions: 50,
        ctr: 0.06,
        position: 8.4,
      },
    ])
  })

  it('returns an empty array when the response has no rows', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({}) } as Response)
    const rows = await fetchGscQueryPositions('https://expertiseaccelerated.com/')
    expect(rows).toEqual([])
  })

  it('throws with the Google error message on a non-2xx response', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      json: async () => ({ error: { message: 'User does not have sufficient permission' } }),
    } as Response)

    await expect(fetchGscQueryPositions('https://expertiseaccelerated.com/')).rejects.toThrow(
      /User does not have sufficient permission/
    )
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test lib/gsc/client.test.ts`
Expected: FAIL with "Cannot find module './client'"

- [ ] **Step 3: Write the implementation**

Create `lib/gsc/client.ts`:

```ts
import { getGoogleAccessToken } from '@/lib/google/auth'

const GSC_SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly'
const SEARCH_CONSOLE_BASE = 'https://searchconsole.googleapis.com/v1'
// GSC data typically lags 2-3 days behind real-time, so the window ends 2 days ago rather
// than today to avoid a trailing tail of partial/zero rows.
const REPORT_LAG_DAYS = 2

export interface GscQueryRow {
  query: string
  page: string
  position: number
  clicks: number
  impressions: number
  ctr: number
}

interface SearchAnalyticsRow {
  keys: [string, string]
  clicks: number
  impressions: number
  ctr: number
  position: number
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export async function fetchGscQueryPositions(siteUrl: string, days = 90): Promise<GscQueryRow[]> {
  const token = await getGoogleAccessToken([GSC_SCOPE])

  const end = new Date()
  end.setDate(end.getDate() - REPORT_LAG_DAYS)
  const start = new Date(end)
  start.setDate(start.getDate() - days)

  const url = `${SEARCH_CONSOLE_BASE}/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      startDate: formatDate(start),
      endDate: formatDate(end),
      dimensions: ['query', 'page'],
      rowLimit: 5000,
    }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}) as { error?: { message?: string } })
    const detail = body?.error?.message ? ` — ${body.error.message}` : ''
    throw new Error(`GSC API error: ${res.status} ${res.statusText}${detail}`)
  }

  const data = (await res.json()) as { rows?: SearchAnalyticsRow[] }
  return (data.rows ?? []).map((row) => ({
    query: row.keys[0],
    page: row.keys[1],
    clicks: row.clicks,
    impressions: row.impressions,
    ctr: row.ctr,
    position: row.position,
  }))
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test lib/gsc/client.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/gsc/client.ts lib/gsc/client.test.ts
git commit -m "feat: add Google Search Console API client"
```

---

## Task 3: Keyword-matching logic

**Files:**
- Create: `lib/gsc/match.ts`
- Test: `lib/gsc/match.test.ts`

**Interfaces:**
- Consumes: `GscQueryRow` from `lib/gsc/client.ts` (Task 2); `TrackedKeyword` from `types/index.ts`
  (already exists).
- Produces:
  ```ts
  export interface GscKeywordMatch {
    keyword: TrackedKeyword
    position: number
    page: string
  }
  export function matchTrackedKeywords(
    keywords: TrackedKeyword[],
    rows: GscQueryRow[]
  ): GscKeywordMatch[]
  ```
  Task 4 (route handler) imports `matchTrackedKeywords` and `GscKeywordMatch`.

- [ ] **Step 1: Write the failing tests**

Create `lib/gsc/match.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { matchTrackedKeywords } from './match'
import type { TrackedKeyword } from '@/types'
import type { GscQueryRow } from './client'

function makeKeyword(overrides: Partial<TrackedKeyword>): TrackedKeyword {
  return {
    id: 'kw-1',
    keyword: 'test keyword',
    priority: 'high',
    category: 'commercial',
    target_url: null,
    monthly_volume: null,
    keyword_difficulty: null,
    cpc: null,
    current_position: null,
    previous_position: null,
    position_updated_at: null,
    notes: null,
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function makeRow(overrides: Partial<GscQueryRow>): GscQueryRow {
  return {
    query: 'test keyword',
    page: 'https://expertiseaccelerated.com/',
    position: 10,
    clicks: 1,
    impressions: 10,
    ctr: 0.1,
    ...overrides,
  }
}

describe('matchTrackedKeywords', () => {
  it('matches a keyword to its GSC row case-insensitively', () => {
    const keyword = makeKeyword({ keyword: 'Best CPA Firm' })
    const row = makeRow({ query: 'best cpa firm', position: 7.2 })

    const matches = matchTrackedKeywords([keyword], [row])

    expect(matches).toEqual([{ keyword, position: 7.2, page: row.page }])
  })

  it('picks the best (lowest) position when a query appears on multiple pages', () => {
    const keyword = makeKeyword({ keyword: 'fractional cfo' })
    const rows = [
      makeRow({ query: 'fractional cfo', page: 'https://expertiseaccelerated.com/blog/', position: 15 }),
      makeRow({ query: 'fractional cfo', page: 'https://expertiseaccelerated.com/fractional-cfo-services/', position: 6 }),
    ]

    const matches = matchTrackedKeywords([keyword], rows)

    expect(matches).toEqual([
      { keyword, position: 6, page: 'https://expertiseaccelerated.com/fractional-cfo-services/' },
    ])
  })

  it('omits keywords with no matching GSC row', () => {
    const keyword = makeKeyword({ keyword: 'no data for this one' })
    const matches = matchTrackedKeywords([keyword], [makeRow({ query: 'something else' })])
    expect(matches).toEqual([])
  })

  it('ignores leading/trailing whitespace when matching', () => {
    const keyword = makeKeyword({ keyword: '  spaced keyword ' })
    const row = makeRow({ query: 'spaced keyword' })
    const matches = matchTrackedKeywords([keyword], [row])
    expect(matches).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test lib/gsc/match.test.ts`
Expected: FAIL with "Cannot find module './match'"

- [ ] **Step 3: Write the implementation**

Create `lib/gsc/match.ts`:

```ts
import type { TrackedKeyword } from '@/types'
import type { GscQueryRow } from './client'

export interface GscKeywordMatch {
  keyword: TrackedKeyword
  position: number
  page: string
}

function normalize(value: string): string {
  return value.trim().toLowerCase()
}

export function matchTrackedKeywords(
  keywords: TrackedKeyword[],
  rows: GscQueryRow[]
): GscKeywordMatch[] {
  const bestByQuery = new Map<string, { position: number; page: string }>()
  for (const row of rows) {
    const key = normalize(row.query)
    const existing = bestByQuery.get(key)
    if (!existing || row.position < existing.position) {
      bestByQuery.set(key, { position: row.position, page: row.page })
    }
  }

  const matches: GscKeywordMatch[] = []
  for (const keyword of keywords) {
    const best = bestByQuery.get(normalize(keyword.keyword))
    if (best) matches.push({ keyword, position: best.position, page: best.page })
  }
  return matches
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test lib/gsc/match.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/gsc/match.ts lib/gsc/match.test.ts
git commit -m "feat: add GSC-to-tracked-keyword matching logic"
```

---

## Task 4: `/api/sync/gsc` route handler

**Files:**
- Create: `app/api/sync/gsc/route.ts`

**Interfaces:**
- Consumes: `getCurrentProfile()` from `lib/auth.ts`; `createAdminSupabaseClient()` from
  `lib/supabase/admin.ts`; `getAppSettings(supabase)` from `lib/settings.ts`;
  `fetchGscQueryPositions(siteUrl, days?)` from `lib/gsc/client.ts` (Task 2);
  `matchTrackedKeywords(keywords, rows)` from `lib/gsc/match.ts` (Task 3); `TrackedKeyword` from
  `types/index.ts`.
- Produces: `POST /api/sync/gsc` → `200 { matched: number, total: number, summary: string }` on
  success, `403`/`502` with `{ error: string }` on failure. Task 5's `SyncButton` calls this
  endpoint.

No new automated test for this task — matches this codebase's existing convention of leaving
Route Handlers untested (see `app/api/sync/ahrefs/route.ts`, `app/api/competitors/sync/route.ts`);
all of the meaningful logic it calls into (auth token, GSC parsing, matching) is already
unit-tested in Tasks 1–3.

- [ ] **Step 1: Write the route handler**

Create `app/api/sync/gsc/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/auth'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { getAppSettings } from '@/lib/settings'
import { fetchGscQueryPositions } from '@/lib/gsc/client'
import { matchTrackedKeywords } from '@/lib/gsc/match'
import type { TrackedKeyword } from '@/types'

export async function POST() {
  const profile = await getCurrentProfile()
  if (!profile || !['admin', 'head'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = createAdminSupabaseClient()
  const settings = await getAppSettings(admin)

  if (!settings.gsc_site_url) {
    const message = 'GSC site URL is not configured — set it via /admin/settings'
    await admin
      .from('sync_logs')
      .insert({ source: 'gsc', status: 'error', message, triggered_by: profile.id } as never)
    return NextResponse.json({ error: message }, { status: 502 })
  }

  let rows
  try {
    rows = await fetchGscQueryPositions(settings.gsc_site_url)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'GSC sync failed'
    await admin
      .from('sync_logs')
      .insert({ source: 'gsc', status: 'error', message, triggered_by: profile.id } as never)
    return NextResponse.json({ error: message }, { status: 502 })
  }

  const { data: keywords, error: keywordsError } = await admin
    .from('tracked_keywords')
    .select('*')
    .eq('is_active', true)

  if (keywordsError) {
    await admin.from('sync_logs').insert({
      source: 'gsc',
      status: 'error',
      message: keywordsError.message,
      triggered_by: profile.id,
    } as never)
    return NextResponse.json({ error: keywordsError.message }, { status: 500 })
  }

  const active = (keywords as TrackedKeyword[]) ?? []
  const matches = matchTrackedKeywords(active, rows)
  const today = new Date().toISOString().slice(0, 10)

  let succeeded = 0
  for (const match of matches) {
    const roundedPosition = Math.round(match.position)
    const { error: updateError } = await admin
      .from('tracked_keywords')
      .update({
        previous_position: match.keyword.current_position,
        current_position: roundedPosition,
        position_updated_at: new Date().toISOString(),
      } as never)
      .eq('id', match.keyword.id)

    if (updateError) continue

    const { error: historyError } = await admin.from('keyword_history').insert({
      keyword_id: match.keyword.id,
      recorded_at: today,
      position: roundedPosition,
      url: match.page,
    } as never)

    if (!historyError) succeeded++
  }

  const failed = matches.length - succeeded
  const summary = `Matched ${succeeded}/${active.length} tracked keywords from Search Console (last 90 days)${
    failed > 0 ? `; ${failed} update(s) failed` : ''
  }`

  await admin.from('sync_logs').insert({
    source: 'gsc',
    status: succeeded === 0 && matches.length > 0 ? 'error' : 'success',
    message: summary,
    triggered_by: profile.id,
  } as never)

  return NextResponse.json({ matched: succeeded, total: active.length, summary })
}
```

- [ ] **Step 2: Manually verify the route compiles and type-checks**

Run: `pnpm exec tsc --noEmit`
Expected: no new type errors introduced by this file.

- [ ] **Step 3: Commit**

```bash
git add app/api/sync/gsc/route.ts
git commit -m "feat: add /api/sync/gsc route handler"
```

---

## Task 5: Wire the "Refresh from GSC" button into `/keywords`

**Files:**
- Modify: `components/dashboard/sync-button.tsx`
- Modify: `app/(dashboard)/keywords/page.tsx`
- Modify: `app/(dashboard)/admin/sync/page.tsx`

**Interfaces:**
- Consumes: `POST /api/sync/gsc` from Task 4.
- Produces: `<SyncButton endpoint={string} label={string} />` (generalized; existing call sites
  keep working via default prop values).

No new automated test — this is a thin UI wiring task with no new pure logic; matches this
codebase's existing convention of not unit-testing components (no `*.test.tsx` exists anywhere
in the repo today).

- [ ] **Step 1: Generalize `SyncButton`**

Replace the full contents of `components/dashboard/sync-button.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface SyncButtonProps {
  endpoint?: string
  label?: string
}

export function SyncButton({ endpoint = '/api/sync/ahrefs', label = 'Sync Ahrefs data' }: SyncButtonProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  return (
    <Button
      disabled={loading}
      onClick={async () => {
        setLoading(true)
        try {
          const res = await fetch(endpoint, { method: 'POST' })
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
      {loading ? 'Syncing…' : label}
    </Button>
  )
}
```

- [ ] **Step 2: Verify existing dashboard call site still works**

Search for other usages: `grep -rn "SyncButton" app components` — confirm the dashboard's
existing `<SyncButton />` call (no props) still renders "Sync Ahrefs data" and posts to
`/api/sync/ahrefs`, since both are now defaults rather than hardcoded.

- [ ] **Step 3: Add the button to `/keywords`**

In `app/(dashboard)/keywords/page.tsx`, add the import and render the button next to the CSV
import dialog, admin/head only:

```tsx
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/auth'
import { KeywordTable } from '@/components/keywords/keyword-table'
import { CsvImportDialog } from '@/components/keywords/csv-import-dialog'
import { SyncButton } from '@/components/dashboard/sync-button'
import type { TrackedKeyword } from '@/types'

export default async function KeywordsPage() {
  const profile = await getCurrentProfile()
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase.from('tracked_keywords').select('*').eq('is_active', true).order('keyword')

  const canSync = profile && ['admin', 'head'].includes(profile.role)

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Keyword Rank Tracker</h1>
        <div className="flex items-center gap-2">
          {canSync && <SyncButton endpoint="/api/sync/gsc" label="Refresh from GSC" />}
          {canSync && <CsvImportDialog />}
        </div>
      </div>
      <KeywordTable keywords={(data as TrackedKeyword[]) ?? []} />
    </div>
  )
}
```

- [ ] **Step 4: Update the `/admin/sync` explainer text**

In `app/(dashboard)/admin/sync/page.tsx`, replace:

```tsx
      <p className="text-sm text-muted-foreground">
        GSC, GA4, and Clarity syncs are v2 scope (CLAUDE.md Section 12) — only Ahrefs is wired up.
      </p>
```

with:

```tsx
      <p className="text-sm text-muted-foreground">
        Ahrefs syncs here; GSC keyword refresh runs from the Keywords page. GA4 and Clarity syncs
        are still v2 scope (CLAUDE.md Section 12).
      </p>
```

- [ ] **Step 5: Manual verification**

Run: `pnpm dev`, log in as an admin or head user, open `/keywords`, confirm the "Refresh from
GSC" button renders next to the CSV import button, and open `/dashboard` to confirm its existing
"Sync Ahrefs data" button still renders and still works unchanged.

- [ ] **Step 6: Commit**

```bash
git add components/dashboard/sync-button.tsx "app/(dashboard)/keywords/page.tsx" "app/(dashboard)/admin/sync/page.tsx"
git commit -m "feat: add GSC refresh button to keywords page"
```

---

## Task 6: Configuration — env vars, CLAUDE.md, and `app_settings.gsc_site_url`

**Files:**
- Modify: `.env.local.example`
- Modify: `CLAUDE.md` (Section 6, Section 7.2 header note)
- No code changes — this task also sets the live `app_settings.gsc_site_url` DB value so the
  route built in Task 4 works end-to-end without a manual `/admin/settings` visit first.

**Interfaces:** None — configuration and documentation only.

- [ ] **Step 1: Update `.env.local.example`**

Replace:

```
# Google (v2 — placeholders only, unused in v1)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REFRESH_TOKEN=
GA4_PROPERTY_ID=
GSC_SITE_URL=
```

with:

```
# Google (service account — GSC + GA4, see lib/google/auth.ts)
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=
GA4_PROPERTY_ID=
GSC_SITE_URL=
```

(`GSC_SITE_URL` stays here only as a local-dev convenience reference — the route itself reads
`app_settings.gsc_site_url` from the database, not this env var, matching how `target_domain`
already works for Ahrefs.)

- [ ] **Step 2: Update CLAUDE.md Section 6 (Environment Variables)**

Find the block:

```
# Google (for both GSC and GA4)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REFRESH_TOKEN=                # Service account refresh token with GSC + GA4 scopes
GA4_PROPERTY_ID=                     # e.g. 123456789
GSC_SITE_URL=                        # e.g. https://expertiseaccelerated.com/
```

Replace with:

```
# Google (service account — used for both GSC and GA4, see Section 7.2/7.3)
GOOGLE_SERVICE_ACCOUNT_EMAIL=        # e.g. ea-seo-tracker-reader@<project-id>.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=  # PEM key, single-line with literal \n
GA4_PROPERTY_ID=                     # e.g. 123456789
GSC_SITE_URL=                        # e.g. https://expertiseaccelerated.com/ — local-dev reference only; the app reads app_settings.gsc_site_url
```

- [ ] **Step 3: Update CLAUDE.md Section 7.2 header note**

Find the line under "### 7.2 Google Search Console API v1":

```
**Scope:** `https://www.googleapis.com/auth/webmasters.readonly`
```

Add directly below it:

```
**Auth (updated 28 Aug 2026):** Google service account (`GOOGLE_SERVICE_ACCOUNT_EMAIL` /
`GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`), added as a Restricted user on the GSC property —
**not** the OAuth refresh-token flow originally described here, to avoid the 7-day
refresh-token expiry an unverified OAuth app is subject to. `lib/google/auth.ts` mints access
tokens on demand from this service account; the same credentials will back GA4 (Section 7.3)
once that integration is built.
```

- [ ] **Step 4: Set the live `app_settings.gsc_site_url` value**

Run this once against the Supabase project (e.g. via the Supabase SQL editor, or `psql`/the
project's connection string):

```sql
update app_settings set gsc_site_url = 'https://expertiseaccelerated.com/' where id = true;
```

- [ ] **Step 5: Verify end-to-end**

With `.env.local` already containing real `GOOGLE_SERVICE_ACCOUNT_EMAIL` /
`GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` values (already set per the design spec's Section 8), run
`pnpm dev`, log in as admin, open `/keywords`, click "Refresh from GSC", and confirm it returns
success (or a clear error naming what's misconfigured, e.g. if the property isn't shared with
the service account yet) rather than throwing an unhandled exception.

- [ ] **Step 6: Commit**

```bash
git add .env.local.example CLAUDE.md
git commit -m "docs: switch GSC/GA4 auth to service account in CLAUDE.md"
```

---

## Self-Review Notes

- **Spec coverage:** Section 2 (auth) → Task 1 + Task 6. Section 3's `lib/google/auth.ts` →
  Task 1; `lib/gsc/client.ts` → Task 2; route handler → Task 4 (matching logic split out to
  Task 3 to keep it unit-testable, per this codebase's "only pure lib/ logic is tested"
  convention — this is a refinement of the spec's Section 3, not a deviation, since the spec's
  route-handler responsibilities are unchanged, just factored differently). UI changes → Task 5.
  Section 4 (data flow) → Tasks 4–5 together. Section 5 (error handling) → Task 4's try/catch +
  per-row failure counting. Section 6 (testing) → Tasks 1–3's test files (route-handler test
  from the spec's Section 6 was dropped in favor of matching codebase convention — see Task 4's
  note). Section 8 (setup) → Task 6.
- **Placeholder scan:** no TBD/TODO; every step has literal code or an exact command.
- **Type consistency:** `GscQueryRow` (Task 2) is the same shape consumed in Task 3's
  `matchTrackedKeywords` and re-exported implicitly via the `GscKeywordMatch.page`/`.position`
  fields used in Task 4. `TrackedKeyword` fields (`current_position`, `previous_position`,
  `position_updated_at`) used in Task 4 match `types/index.ts`'s existing definition exactly.
