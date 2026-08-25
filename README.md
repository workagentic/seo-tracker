# EA SEO Tracker

Internal SEO tracking and accountability dashboard for the Expertise Accelerated SEO team.

## Getting Started

1. Prerequisites: Node 20+ and pnpm.
2. Install dependencies: `pnpm install`
3. Copy `.env.local.example` to `.env.local` and fill in the required values. `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are required for the app to function. The Ahrefs, Google, and Clarity vars are optional/v2 — the app runs fine with them unset, since Ahrefs falls back to fixture data.
4. Start the dev server: `pnpm dev` and open http://localhost:3000 (this redirects to `/login`).
5. For a working login, you'll need a real Supabase project with the schema and seed data loaded — see "Database setup" and "Seeding order" below.
6. Other useful commands: `pnpm build` for a production build, `pnpm test` for the unit test suite.

## Database setup

1. Create a Supabase project at supabase.com.
2. In the SQL Editor, run `supabase/migrations/0001_initial_schema.sql`, then `supabase/migrations/0002_rls_policies.sql`, then `supabase/seed.sql` (added in a later task).
3. Copy the project URL, anon key, and service role key into `.env.local` (see `.env.local.example`).

## Seeding order
1. Run migrations (see Database setup).
2. `pnpm seed:users` — creates the 9 auth users + profiles. Note the printed temp passwords.
3. Run `supabase/seed.sql` in the Supabase SQL editor — seeds the 34 tasks, baseline snapshot, audit findings, and starter keywords.

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
