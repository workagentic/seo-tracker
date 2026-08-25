-- "Automatically expose new tables" was disabled when this project was created
-- (a deliberate choice — CLAUDE.md Section 4 already defines RLS as the real
-- access gate), so tables created by 0001/0002 never received the default
-- Data API grants Supabase normally assigns automatically. Without an
-- explicit GRANT, even service_role (which bypasses RLS) still needs
-- table-level privileges to read/write — RLS and GRANT are separate layers.
grant usage on schema public to service_role, authenticated;

grant select on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;

-- Cover any table added later without a matching grants migration.
alter default privileges in schema public grant select on tables to authenticated;
alter default privileges in schema public grant usage, select on sequences to authenticated;
alter default privileges in schema public grant all privileges on tables to service_role;
alter default privileges in schema public grant all privileges on sequences to service_role;
