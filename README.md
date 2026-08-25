# EA SEO Tracker

Internal SEO tracking and accountability dashboard for the Expertise Accelerated SEO team.

## Database setup

1. Create a Supabase project at supabase.com.
2. In the SQL Editor, run `supabase/migrations/0001_initial_schema.sql`, then `supabase/migrations/0002_rls_policies.sql`, then `supabase/seed.sql` (added in a later task).
3. Copy the project URL, anon key, and service role key into `.env.local` (see `.env.local.example`).
