# GSC Indexing Issues → Audit Reports — Design Spec

**Status:** Approved for planning
**Solves:** User request to surface Google Search Console's website issues inside the
existing Audit Reports section (`/audit`).

---

## 1. Goal & constraint

Show GSC-reported problems (pages that aren't indexed, sitemap errors) as findings on
`/audit`, alongside the existing manually-entered findings.

**Hard constraint (confirmed against `lib/gsc/client.ts` and CLAUDE.md Section 8.4's own
"no separate coverage API" note):** GSC's public API has no bulk "Coverage"/"Enhancements"
issues export — that report only exists in the GSC web UI. The only real building blocks are:

- **URL Inspection API** (`urlInspection.index.inspect`) — per-URL indexing status. One call
  per URL, not a site-wide scan.
- **Sitemaps API** — error/warning counts per submitted sitemap.

This spec is scoped to exactly those two. `indexStatusResult` is the part of URL Inspection
I'm confident is still live; if `mobileUsabilityResult`/`richResultsResult` turn out to also
still be returned when this is implemented, they're a bonus to fold in later — not promised
here.

## 2. Scope decisions (confirmed with the user)

- **Which URLs to inspect:** distinct `target_url` values from active `tracked_keywords` —
  already the curated set of pages the SEO team cares about, no new admin UI needed.
- **Auto-resolve:** when a previously-flagged URL/sitemap now inspects clean, the sync
  auto-resolves that `audit_reports` row (`status = 'resolved'`), matching the existing
  linked-task auto-resolve pattern (Section 8.3/8.7).
- **Cadence:** both a manual "Check GSC Issues" button (admin/senior) on `/audit`, and folded
  into the existing weekly cron — matching every other integration in this app (Ahrefs, GSC
  keywords, GA4, Clarity, competitors all have both).

## 3. Schema

`supabase/migrations/0032_audit_gsc_source.sql`:

```sql
alter table audit_reports add column source text not null default 'manual'
  check (source in ('manual', 'gsc'));
alter table audit_reports add column source_key text;

-- One row per (source, source_key) for GSC-sourced findings, so a re-sync updates/resolves
-- the same row instead of creating duplicates. Manual findings have source_key = null, and
-- Postgres treats NULLs as distinct, so this never constrains them.
create unique index audit_reports_gsc_source_key_idx on audit_reports (source, source_key)
  where source = 'gsc';
```

`source_key` holds the inspected URL (for index-coverage findings) or the sitemap path (for
sitemap findings) — the stable identifier used to find-and-update the same finding next sync.

`types/index.ts`'s `AuditReport` gets `source: 'manual' | 'gsc'` and `source_key: string | null`.

## 4. Components

### `lib/gsc/issues.ts` (new) — pure API client, no DB access

```ts
interface UrlInspectionResult {
  coverageState: string   // GSC's free-text state, e.g. "Submitted and indexed"
  verdict: string         // 'PASS' | 'PARTIAL' | 'FAIL' | 'NEUTRAL' | 'VERDICT_UNSPECIFIED'
  robotsTxtState: string | null
  lastCrawlTime: string | null
}
fetchUrlInspection(siteUrl: string, inspectionUrl: string): Promise<UrlInspectionResult>

interface SitemapIssue {
  path: string
  errors: number
  warnings: number
}
fetchSitemapIssues(siteUrl: string): Promise<SitemapIssue[]>
```

Both reuse `getGoogleAccessToken` (`lib/google/auth.ts`) with scope
`https://www.googleapis.com/auth/webmasters.readonly` — same auth already proven for
`fetchGscQueryPositions`. Base URL: `https://searchconsole.googleapis.com/v1` for URL
Inspection (`POST /urlInspection/index:inspect`); Sitemaps API base URL needs confirming
against the live API during implementation the same way the existing GSC/Clarity base-URL
corrections in CLAUDE.md Section 7.2/7.4 were — it may be `/v1` or the `/webmasters/v3` path
`fetchGscQueryPositions` already uses. Non-2xx responses throw, same error shape as
`fetchGscQueryPositions`.

### `lib/gsc/issue-classifier.ts` (new) — pure mapping function, unit-testable

```ts
function classifyCoverageState(coverageState: string, verdict: string): {
  hasIssue: boolean
  severity: AuditSeverity | null
  summary: string
}
```

Best-effort mapping (Google doesn't publish `coverageState` as a fixed enum, so this is
deliberately a simple lookup table that's easy to extend without a migration if real API
responses during implementation don't match exactly):

| Coverage state | Treatment |
|---|---|
| "Submitted and indexed", "Indexed, not submitted in sitemap", "Alternate page with proper canonical tag" | OK — no issue |
| "Not found (404)", "Server error (5xx)", "Blocked due to unauthorized request (401)" | critical |
| "Blocked by robots.txt", "Excluded by 'noindex' tag", "Duplicate, Google chose different canonical than user" | high |
| "Crawled - currently not indexed", "Discovered - currently not indexed", "Duplicate without user-selected canonical", "Page with redirect" | medium |
| anything else not explicitly OK, with `verdict !== 'PASS'` | low (catch-all) |

Sitemap issues map directly: any sitemap with `errors > 0` → high, `warnings > 0` only →
medium.

### `lib/gsc/auditSync.ts` (new) — DB-integration orchestration

Mirrors `lib/gsc/sync.ts`'s `runGscSync` / `lib/ahrefs/competitorSync.ts`'s
`runCompetitorSync` shape exactly, so both the manual route and the weekly cron call it:

```ts
export async function runGscAuditSync(admin: SupabaseClient, triggeredBy: string | null): Promise<GscAuditSyncResult>
```

1. `getAppSettings(admin)` for `gsc_site_url`; 502 + `sync_logs` error row if unset (same as
   `runGscSync`).
2. Distinct, non-null `target_url` values from `tracked_keywords where is_active = true`.
3. For each URL, sequentially with a 300ms delay between calls (a conservative constant,
   `GSC_INSPECTION_DELAY_MS` in `lib/gsc/issues.ts`, gentle on URL Inspection's quota — same
   spirit as Ahrefs' `AHREFS_INTER_DOMAIN_DELAY_MS`): `fetchUrlInspection` →
   `classifyCoverageState` → `upsertGscFinding`. A single URL's failure is caught and skipped,
   not fatal to the batch (same per-item try/catch as `runCompetitorSync`).
4. `fetchSitemapIssues` once → `upsertGscFinding` per sitemap with errors/warnings.
5. `upsertGscFinding(admin, { sourceKey, hasIssue, severity, title, finding, recommendation })`:
   - No issue + an existing non-resolved row for that `source_key` → set `status = 'resolved'`,
     `resolved_at = now()`.
   - No issue + no existing row → no-op.
   - Issue + existing row → update `title`/`severity`/`finding`/`recommendation`; if that row
     was `resolved`, reopen it to `open` (the issue recurred).
   - Issue + no existing row → insert (`category: 'technical'`, `source: 'gsc'`, `source_key`,
     `status: 'open'`).
6. One `sync_logs` row, `source: 'gsc-issues'`, summary like `"Checked 42 URLs: 6 issue(s)
   found/updated, 2 resolved; sitemap: 1 issue(s)"`.

### `app/api/audit/gsc-sync/route.ts` (new)

`POST`, admin/senior only (403 otherwise, same guard as `/api/sync/ahrefs`). Calls
`runGscAuditSync(admin, profile.id)`, returns its body/status.

### `app/api/cron/weekly-snapshot/route.ts` (edit)

Add `const gscAudit = await runGscAuditSync(admin, null)` alongside the existing sync calls,
fold its result into the summary message the same way the others already are.

### UI changes

- `app/(dashboard)/audit/page.tsx`: render the existing generic
  `<SyncButton endpoint="/api/audit/gsc-sync" label="Check GSC Issues" />` next to
  `NewFindingDialog`, same admin/senior guard — **no new button component needed**,
  `components/dashboard/sync-button.tsx` was already generalized to take `endpoint`/`label`
  props for exactly this kind of reuse (see the GSC-keywords spec, Section 3 "UI changes").
- `components/audit/audit-card.tsx`: small "GSC" badge next to the severity/status badges
  when `report.source === 'gsc'`, so auto-generated findings are visually distinguishable
  from manually-entered ones.

## 5. Data flow

```
Admin clicks "Check GSC Issues" (or weekly cron fires)
  → runGscAuditSync(admin, triggeredBy)
    → getAppSettings() for gsc_site_url
    → distinct target_urls from active tracked_keywords
    → for each url: fetchUrlInspection → classifyCoverageState → upsertGscFinding
    → fetchSitemapIssues → upsertGscFinding per sitemap
    → insert sync_logs row
  → 200 { checked, issuesFound, resolved, summary }
→ router.refresh() re-renders /audit from the DB, GSC-sourced cards show the "GSC" badge
```

## 6. Error handling

- Missing `gsc_site_url` or a Google auth/API failure on the *first* call → whole sync aborts,
  502, logged to `sync_logs` — no partial writes (mirrors `runGscSync`).
- A single URL's inspection failing mid-batch (timeout, malformed response) is caught,
  skipped, and counted — doesn't abort the rest (mirrors `runCompetitorSync`'s per-domain
  try/catch).
- Sitemap fetch failing doesn't block the URL-inspection half or vice versa — they're
  independent steps, each wrapped in its own try/catch.

## 7. Testing

- `lib/gsc/issue-classifier.test.ts` — table-driven test of `classifyCoverageState` against
  every row in the mapping table above, plus the catch-all case.
- `lib/gsc/issues.test.ts` — mocks `fetch`, mirrors `lib/gsc/client.test.ts`'s style (success
  case, non-2xx error case, request shape).
- `lib/gsc/auditSync.test.ts` (if the codebase's convention allows testing DB-integration
  logic with a mocked Supabase client — otherwise this stays untested like `runGscSync`/
  `runCompetitorSync`, both explicitly documented as such): covers the upsert decision matrix
  (no issue/no row, no issue/existing row → resolve, issue/no row → insert, issue/existing
  open row → update, issue/existing resolved row → reopen).

## 8. Explicitly out of scope

- `mobileUsabilityResult`/`richResultsResult` from URL Inspection — not promised, may be added
  later if still live.
- Any URL source other than `tracked_keywords.target_url` (top pages, admin-managed list) —
  can be revisited if the tracked-keywords set proves too narrow.
- Historical trend of GSC issues over time (no `audit_gsc_issue_history` table) — `audit_reports`
  already has no history table for manual findings either, consistent with existing scope.
