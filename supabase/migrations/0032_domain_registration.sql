-- Domain-age / WHOIS-style registration info for the Competitor Tracker (23 Sep 2026 session,
-- docs/superpowers/specs -- brainstormed in chat, no separate spec file for this one small
-- feature). Fetched via free RDAP lookups (lib/rdap/client.ts), not a paid WHOIS API. This
-- data is nearly static (creation date never changes; expiry/updated shift maybe once a year),
-- so it's fetched once on add + a manual "Refresh domain info" action -- not on every Ahrefs
-- sync -- and just needs plain columns, no snapshot/history table.

alter table competitors add column domain_created_at date;
alter table competitors add column domain_expires_at date;
alter table competitors add column domain_updated_at date;

-- EA's own domain. app_settings is the existing singleton home for target_domain, so its
-- registration info lives alongside it rather than a new table for one row.
alter table app_settings add column domain_created_at date;
alter table app_settings add column domain_expires_at date;
alter table app_settings add column domain_updated_at date;

-- No RLS/grant changes needed -- both tables' existing policies (competitors: team-wide
-- select, admin-only write via the service-role client; app_settings: same) already cover
-- these new columns, same as every other column added to either table by a prior migration.
