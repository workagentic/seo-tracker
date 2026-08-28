# GSC Integration — Design Spec

**Status:** Approved for planning
**Parent scope:** This is sub-project 1 of 3 in the "connect GSC/GA4/Clarity" effort (CLAUDE.md
Section 7.2–7.4, Section 12.5). GA4 and Clarity each get their own spec/plan cycle afterward.
**Solves:** CLAUDE.md Section 7.2 (Google Search Console API) and the user-reported gap
"No option to Refresh keywords ranking (through GSC)".

---

## 1. Goal

Let an admin/head user pull live keyword position data from Google Search Console into the
existing `/keywords` page with one button click, replacing the current all-manual keyword
table (populated only via CSV import today).

## 2. Auth — service account (not OAuth refresh token)

CLAUDE.md Section 6/7.2/12.5 as originally written describe a Google OAuth refresh-token flow.
This spec deviates from that and uses a **Google service account** instead, matching the
pattern already proven working in production on the MaxGreen project
(`MaxGreen-SEO-CLAUDE.md`):

- No interactive consent screen, no refresh-token lifecycle.
- Avoids the 7-day refresh-token expiry that applies to an unverified ("Testing" mode) OAuth
  app — a service account key has no such expiry.
- Setup is: create service account in the existing `expertise-accelerated` GCP project → add
  its email as a **Restricted** user on the `expertiseaccelerated.com` Search Console property
  → done. (Already completed as of this spec — see Section 8.)

CLAUDE.md Section 6 will be updated to reflect this: `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
/ `GOOGLE_REFRESH_TOKEN` are replaced with `GOOGLE_SERVICE_ACCOUNT_EMAIL` and
`GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` (PEM, single-line with literal `\n`, unescaped at read
time — same convention as MaxGreen's `GOOGLE_SHEETS_PRIVATE_KEY`).

## 3. Components

### `lib/google/auth.ts` (new)
- `getGoogleAccessToken(scopes: string[]): Promise<string>`
- Builds a `google-auth-library` `JWT` client from `GOOGLE_SERVICE_ACCOUNT_EMAIL` +
  `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` (with `\n` unescaped to real newlines), requests an
  access token for the given scopes via `.authorize()`.
- Caches the token + expiry in a module-level variable, keyed by the joined scope string, and
  re-mints only when within 60s of expiry — avoids a token request on every call within the
  same process lifetime.
- Throws a clear error if either env var is missing (caught by the route handler, same pattern
  as `fetchAhrefsMetrics` throwing when `AHREFS_API_KEY` is absent).
- New dependency: `google-auth-library` (add to `package.json`).

### `lib/gsc/client.ts` (new)
- `fetchGscQueryPositions(siteUrl: string, days = 90): Promise<GscQueryRow[]>`
  ```ts
  interface GscQueryRow {
    query: string
    page: string
    position: number   // GSC's fractional average position, unrounded
    clicks: number
    impressions: number
    ctr: number
  }
  ```
- One `POST https://searchconsole.googleapis.com/v1/sites/{encodeURIComponent(siteUrl)}/searchAnalytics/query`
  with `Authorization: Bearer <token>` (scope `https://www.googleapis.com/auth/webmasters.readonly`),
  body `{ startDate, endDate, dimensions: ['query', 'page'], rowLimit: 5000 }` where
  `startDate`/`endDate` cover the trailing `days` window ending yesterday (GSC data has a ~2-3
  day lag; querying through "today" reliably returns partial/zero rows for the most recent days).
- Non-2xx response throws `GSC API error: {status} {statusText}` with the response body's
  `error.message` appended if present (mirrors `ahrefsGet`'s error shape).
- No rate-limit sleep needed — GSC's quota is generous for one call per sync.

### `app/api/sync/gsc/route.ts` (new)
- `POST`, admin/head only (403 otherwise — same guard as `/api/sync/ahrefs`).
- Reads `gsc_site_url` from `app_settings` via `getAppSettings(admin)` (DB-driven, **not**
  `process.env.GSC_SITE_URL` — matches how `target_domain` already works for Ahrefs). Returns
  502 + logs to `sync_logs` if it's empty/null.
- Fetches all active `tracked_keywords`.
- Calls `fetchGscQueryPositions(siteUrl)` once.
- Builds a case-insensitive map: `trimmedLowercase(query) → best row` (best = lowest/best
  `position` when a query appears against multiple pages).
- For each active tracked keyword with a case-insensitive exact match:
  - `previous_position ← current_position` (old value)
  - `current_position ← Math.round(bestRow.position)`
  - `position_updated_at ← now()`
  - Insert one `keyword_history` row: `{ keyword_id, recorded_at: today, position: rounded, url: bestRow.page }`
- Keywords with no match are left untouched — "no GSC data in the window" is not the same as
  "position is null/zero", so nothing is overwritten.
- On completion, insert one `sync_logs` row: `source: 'gsc'`, `status: 'success'`, message like
  `"Matched 12/34 tracked keywords from Search Console (last 90 days)"`. A thrown error before
  that point logs `status: 'error'` with the caught message instead (mirrors the Ahrefs route's
  try/catch shape).

### UI changes
- `components/dashboard/sync-button.tsx`: generalize from hardcoded `/api/sync/ahrefs` to accept
  `endpoint: string` and `label: string` props (defaulting to today's Ahrefs values so the
  existing dashboard call site needs no changes).
- `app/(dashboard)/keywords/page.tsx`: render `<SyncButton endpoint="/api/sync/gsc" label="Refresh from GSC" />`
  next to the existing CSV import button, admin/head only (same `profile.role` check already
  used for `CsvImportDialog`).
- `app/(dashboard)/admin/sync/page.tsx`: update the static explainer paragraph (currently "only
  Ahrefs is wired up") to mention GSC is now live; the log table itself needs no change since it
  already renders any `source` value generically.

## 4. Data flow

```
User clicks "Refresh from GSC" (admin/head only)
  → POST /api/sync/gsc
    → getAppSettings() for gsc_site_url
    → fetchGscQueryPositions(siteUrl)   [1 external call]
    → for each active tracked_keyword: match → update row + insert keyword_history row
    → insert sync_logs row
  → 200 { matched, total, summary }
→ router.refresh() re-renders /keywords from the DB
```

## 5. Error handling

- Missing service-account env vars, missing `gsc_site_url`, or a Google API error (e.g.
  property not shared with the service account) → 502, logged to `sync_logs` with the real
  error message, **no partial writes** to `tracked_keywords`/`keyword_history` (the whole sync
  either fully applies its per-keyword updates after a successful fetch, or fails before any
  writes happen — the single external call happens before the update loop starts).
- A per-keyword DB update failure inside the loop is caught individually so one bad row doesn't
  abort the rest of the batch; failures are counted and folded into the summary message.

## 6. Testing

- `lib/gsc/client.test.ts` — mocks `fetch`, mirrors the existing style of
  `lib/ahrefs/client.test.ts` (success case, non-2xx error case, verifies request URL/body
  shape).
- `lib/google/auth.test.ts` — verifies token caching (second call within expiry doesn't refetch),
  verifies missing-env-var throws.
- Route handler test for `/api/sync/gsc`: role guard (403 for `owner`/`leadership`), matching
  logic against a fixture GSC response, verifies unmatched keywords are left untouched.

## 7. Explicitly out of scope for this sub-project

- GA4 and Clarity integrations (separate specs).
- Any GSC-sourced dashboard stat tile (Section 8.2's "Live Indexed Content Pages" GSC fallback)
  — this spec only covers the keyword-refresh use case.
- Weekly/scheduled auto-sync — this is a manual button, same as Ahrefs sync today.

## 8. Setup already completed (as of 2026-08-28)

- GCP project `expertise-accelerated`: Search Console API + Analytics Data API enabled.
- Service account `ea-seo-tracker-reader@expertise-accelerated.iam.gserviceaccount.com` created,
  key downloaded, added as a **Restricted** user on the `expertiseaccelerated.com` Search
  Console property (URL-prefix property, confirmed via the property's resource_id).
- `GOOGLE_SERVICE_ACCOUNT_EMAIL` / `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` / `GA4_PROPERTY_ID` /
  `GSC_SITE_URL` / `CLARITY_API_TOKEN` written to `.env.local` (gitignored); the downloaded JSON
  key file was deleted from disk after extraction.
- **Remaining before this can run end-to-end:** `app_settings.gsc_site_url` (the DB column the
  route actually reads, per Section 3) still needs to be set to `https://expertiseaccelerated.com/`
  — either via `/admin/settings` in the running app, or directly during implementation.
