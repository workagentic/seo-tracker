-- Auto-generated Audit Reports findings, sourced from Google Search Console (URL Inspection +
-- Sitemaps) and PageSpeed Insights (23 Sep 2026 session). See
-- docs/superpowers/specs/2026-09-23-gsc-audit-issues-design.md.

alter table audit_reports add column source text not null default 'manual'
  check (source in ('manual', 'gsc', 'pagespeed'));
alter table audit_reports add column source_key text;

-- One row per (source, source_key) for auto-generated findings, so a re-sync updates/resolves
-- the same row instead of creating duplicates. Manual findings have source_key = null, and
-- Postgres treats NULLs as distinct, so this never constrains them. 'gsc' covers both
-- index-coverage findings (source_key = the page URL) and sitemap findings (source_key = the
-- sitemap path) -- those two never collide since a sitemap path and a page URL are never
-- equal. 'pagespeed' is a separate source value, so a URL can independently have both a GSC
-- finding and a PageSpeed finding without key collisions.
create unique index audit_reports_auto_source_key_idx on audit_reports (source, source_key)
  where source in ('gsc', 'pagespeed');
