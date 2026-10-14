# Task Tracker Excel Import — Design Spec

**Status:** Approved for planning
**Solves:** User request (Tabish/Haroon, Task Tracker) to bulk-import tasks from an Excel
file instead of adding each one manually via "New Task" — the current ~55+ task/quarter
register is entirely hand-entered.

---

## 1. Goal

Let an admin/senior user upload a `.xlsx` spreadsheet on `/tasks` and have it create all the
valid rows as tasks in one action, respecting the same business rules "New Task" already
enforces (Owner restricted to 3 eligible people, deadline never after due date, category must
be a real category) — instead of silently creating bad data or requiring a code deploy.

## 2. Why this differs from the existing Keywords CSV import

`components/keywords/csv-import-dialog.tsx` parses CSV client-side with `papaparse` and POSTs
JSON rows to `app/api/keywords/import/route.ts`. Two things make Tasks different enough to
warrant a different shape, confirmed with the user:

- **File format:** the user explicitly asked for **Excel (`.xlsx`)**, not CSV. `papaparse`
  can't read binary `.xlsx`. New dependency: **`xlsx`** (SheetJS) — the standard library for
  reading Excel files in Node, no native bindings.
- **Validation weight:** `tracked_keywords` has almost no cross-field validation (just "is
  there a keyword"). `tasks` has real business rules (Owner must resolve to one of exactly 3
  eligible people by name — `lib/tasks/constants.ts`'s `ELIGIBLE_OWNER_NAMES`; Assigned To
  must resolve to any existing profile by name; Category must resolve to an existing
  `task_categories.name`; `deadline` must never be later than `due_date`). This needs a real
  per-row validation pass, not a single blind insert.

**Decision (confirmed with the user): parse server-side**, not client-side like the Keywords
flow. The browser uploads the raw file via `multipart/form-data`; `xlsx` parses it inside the
API route. Reasons: binary parsing is more robust done once, server-side; it keeps a ~1MB
parsing library out of the client bundle; and it makes the validation logic a plain,
independently testable function instead of logic split across a client component and a route.

## 3. Scope decisions (confirmed with the user)

- **Partial success, not all-or-nothing:** rows that pass validation are created; rows that
  fail are skipped and reported with a specific reason (e.g. "Row 14: Owner 'Talha Azeem' is
  not one of the 3 eligible owners"). The uploader fixes just the bad rows and re-uploads —
  they don't lose the valid rows while fixing typos in others.
- **Downloadable template:** a "Download template" link next to "Import from Excel" serves a
  pre-built `.xlsx` with the correct headers and one example row — friendlier for a
  non-technical spreadsheet user than a text list of column names (which is all the Keywords
  import offers today).
- **Permission:** admin/senior only, matching "New Task" creation's existing gate (not a new,
  separate permission level).

## 4. Template columns

`Action Number` (optional) · `Title` (**required**) · `Description` · `Owner` (name) ·
`Assigned To` (name) · `Due Date` · `Deadline` · `Quarter` · `Category` (name) · `Notes` ·
`Link URL`.

**No `Status` column.** Every imported task starts `pending`, period — bulk-importing a task
as already `completed`/`in_progress` would bypass the entire point of tracking it (and
`completed` is Owner-gated at the app layer for a reason). If someone needs a different
starting status, they set it after import the normal way.

`Owner` / `Assigned To` / `Category` are matched by **exact name, case-insensitive** against
`profiles.full_name` / `task_categories.name`. `Due Date` / `Deadline` accept any format
`xlsx`'s own date parsing recognizes (Excel serial dates and ISO strings both work via the
library's `cellDates: true` option) and are normalized to `YYYY-MM-DD`.

## 5. Components

### `lib/tasks/excel-import.ts` (new) — pure, unit-tested, no DB/file I/O at this layer

```ts
export interface RawImportRow {
  'Action Number'?: string
  'Title'?: string
  'Description'?: string
  'Owner'?: string
  'Assigned To'?: string
  'Due Date'?: string
  'Deadline'?: string
  'Quarter'?: string
  'Category'?: string
  'Notes'?: string
  'Link URL'?: string
}

export function parseWorkbook(buffer: Buffer): RawImportRow[]
// xlsx.read(buffer, { cellDates: true }) -> first sheet -> xlsx.utils.sheet_to_json

export interface ValidationContext {
  eligibleOwners: { id: string; name: string }[]   // profiles filtered to ELIGIBLE_OWNER_NAMES
  profiles: { id: string; name: string }[]          // all profiles, for Assigned To
  categories: { id: string; name: string }[]        // all task_categories
}

export type ValidatedRow =
  | { ok: true; task: TaskInsertPayload }
  | { ok: false; reason: string }

export function validateImportRow(row: RawImportRow, ctx: ValidationContext): ValidatedRow
```

`validateImportRow` logic, in order:
1. No `Title` (blank/whitespace) → `{ ok: false, reason: 'Title is required' }`.
2. `Owner` given but no case-insensitive match in `ctx.eligibleOwners` → `{ ok: false, reason:
   "Owner '<value>' is not one of the 3 eligible owners" }`. `Owner` blank → `owner_id: null`
   (allowed — mirrors "New Task" where Owner isn't mandatory at creation).
3. `Assigned To` given but no match in `ctx.profiles` → `{ ok: false, reason: "Assigned To
   '<value>' does not match any profile" }`.
4. `Category` given but no match in `ctx.categories` → `{ ok: false, reason: "Category
   '<value>' does not match any existing category" }`.
5. Both `Due Date` and `Deadline` present and `Deadline > Due Date` → `{ ok: false, reason:
   'Deadline cannot be later than the Due date' }`.
6. Otherwise → `{ ok: true, task: { title, description, action_number, owner_id,
   assigned_to_id, due_date, deadline, quarter, category_id, notes, link_url, status:
   'pending' } }`.

### `app/api/tasks/import/route.ts` (new)

`POST`, `multipart/form-data` with one `file` field. Admin/senior only (403 otherwise, same
guard as `POST /api/tasks`). Flow:
1. Read the uploaded file into a `Buffer`; `parseWorkbook` it. A throw here (corrupt/wrong
   file type) → one top-level `{ error: '...' }`, 400, nothing imported.
2. Fetch `eligibleOwners`/`profiles`/`categories` once (three small queries) to build
   `ValidationContext`.
3. Run every row through `validateImportRow`.
4. Batch-insert every `ok: true` row's `task` in one `admin.from('tasks').insert([...])` call
   (same single-batch-insert pattern as the Keywords import).
5. Return `{ imported: <count>, skipped: [{ row: <1-indexed row number>, reason }] }`.

### `components/tasks/excel-import-dialog.tsx` (new)

Mirrors `CsvImportDialog`'s shape: a Dialog triggered by an "Import from Excel" button next to
"New Task" on `/tasks` (`app/(dashboard)/tasks/page.tsx`, same admin/senior visibility check
already gating "New Task"). Contents: a "Download template" link (`<a href="/task-import-
template.xlsx" download>`, a static file in `public/`, built once — not generated per
request), a file input accepting `.xlsx`, and an "Import" button that POSTs the file as
`FormData`. After a response: shows "`Imported N task(s).`" and, if `skipped.length > 0`, a
list of "Row X: reason" lines. Closes and `router.refresh()`s only after the user dismisses
the result (so they have time to read which rows were skipped) rather than auto-closing like
the Keywords dialog does.

### Template file (`public/task-import-template.xlsx`)

Built once during implementation (a small one-off script using the same `xlsx` library,
writing the header row + one realistic example row), committed as a static asset — not
generated dynamically on every request, since the content never changes.

## 6. Data flow

```
Admin/senior clicks "Import from Excel" -> picks a .xlsx file -> clicks "Import"
  -> POST /api/tasks/import (multipart/form-data)
    -> parseWorkbook(buffer) -> RawImportRow[]
    -> fetch eligibleOwners/profiles/categories
    -> validateImportRow per row -> { ok, task } | { ok: false, reason }
    -> batch insert all ok:true tasks
  -> 200 { imported, skipped: [{ row, reason }] }
-> dialog shows the result -> on dismiss, router.refresh()
```

## 7. Error handling

- Corrupt file / not actually an Excel file → `parseWorkbook` throws, route returns one
  top-level 400 error, nothing imported (there's nothing meaningful to partially import from
  an unparseable file).
- Any other per-row problem (missing title, bad name match, deadline/due-date conflict) skips
  only that row — every valid row in the same upload still imports, per the user's explicit
  "partial success" decision.
- The batch insert itself failing (DB-level error) → 500, no `imported` count misrepresented
  (nothing was actually inserted if the single batch insert call fails).

## 8. Testing

- `lib/tasks/excel-import.test.ts` — the full validation matrix as pure unit tests: valid row
  with everything filled in, valid row with only Title, missing Title, Owner not in the
  eligible 3, Assigned To not matching any profile, Category not matching any existing
  category, `deadline > due_date`, case-insensitive name matching for Owner/Category. No file
  I/O or DB in these tests — `validateImportRow` takes plain objects.
- `parseWorkbook` gets a lighter test using an in-memory workbook built with `xlsx.utils` in
  the test itself (write a small workbook, read it back, assert the rows match) rather than a
  checked-in binary fixture file.

## 9. Explicitly out of scope

- Editing/previewing rows before import (no "review" step) — matches the Keywords import's
  directness; the per-row skip reasons after the fact serve the same correction purpose.
- `Repeats`/`Next Due`/linked-finding/linked-keyword columns — importable later via the UI;
  not worth the template complexity for a first version.
- Re-importing the same file safely (no dedup/upsert by `Action Number` or title) — every
  import run creates new rows; re-uploading the same file creates duplicates. Not asked for,
  and the per-row skip-reporting already gives the uploader a clear "fix and re-upload" loop
  for the rows that failed, not a "re-run the whole file safely" guarantee.
