-- Run AFTER scripts/seed-users.ts has created the 9 profiles.

insert into tasks (action_number, title, position_responsible, assigned_to, co_assigned_to, due_date, quarter)
select 'A1', 'Terminate paid link-building vendor',
  'Haroon', (select id from profiles where full_name = 'Haroon'),
  (select id from profiles where full_name = 'Tabish Khalid'), '2026-08-27'::date, 'Q1'
union all select 'A2', 'Programme kickoff and RACI sign-off',
  'Tabish Khalid', (select id from profiles where full_name = 'Tabish Khalid'),
  null, '2026-08-27'::date, 'Q1'
union all select 'A3', 'Agree CPA review SLA',
  'Haroon', (select id from profiles where full_name = 'Haroon'),
  (select id from profiles where full_name = 'Najma Furqan'), '2026-08-27'::date, 'Q1'
union all select 'A4', 'Assign cross-training backups',
  'Tabish Khalid', (select id from profiles where full_name = 'Tabish Khalid'),
  null, '2026-08-29'::date, 'Q1'
union all select 'A5', 'Stand up tracking infrastructure',
  'Abdullah Shekha', (select id from profiles where full_name = 'Abdullah Shekha'),
  null, '2026-08-29'::date, 'Q1'
union all select 'A6', 'Fix eaccelerated.com redirect (302→301)',
  'Usman Ali', (select id from profiles where full_name = 'Usman Ali'),
  (select id from profiles where full_name = 'Talha Azeem'), '2026-08-29'::date, 'Q1'
union all select 'A7', 'Classify full referring-domain list (all 861)',
  'Talha Azeem', (select id from profiles where full_name = 'Talha Azeem'),
  null, '2026-09-02'::date, 'Q1'
union all select 'A8', 'Resolve UR 9.9 Cloudflare 404',
  'Usman Ali', (select id from profiles where full_name = 'Usman Ali'),
  (select id from profiles where full_name = 'Talha Azeem'), '2026-09-02'::date, 'Q1'
union all select 'A9', 'Brief all 15 striking-distance pages',
  'Najma Furqan', (select id from profiles where full_name = 'Najma Furqan'),
  null, '2026-09-02'::date, 'Q1'
union all select 'A10', 'File disavow in Search Console',
  'Talha Azeem', (select id from profiles where full_name = 'Talha Azeem'),
  null, '2026-09-05'::date, 'Q1'
union all select 'A11', 'Recover UR 11.7 redirect chains',
  'Usman Ali', (select id from profiles where full_name = 'Usman Ali'),
  (select id from profiles where full_name = 'Talha Azeem'), '2026-09-05'::date, 'Q1'
union all select 'A12', 'Restore /fractional-cfo-services/',
  'Talha Azeem', (select id from profiles where full_name = 'Talha Azeem'),
  (select id from profiles where full_name = 'Najma Furqan'), '2026-09-05'::date, 'Q1'
union all select 'A13', 'Resolve HTTP/HTTPS duplication',
  'Usman Ali', (select id from profiles where full_name = 'Usman Ali'),
  (select id from profiles where full_name = 'Talha Azeem'), '2026-09-12'::date, 'Q1'
union all select 'A14', 'Resolve keyword cannibalisation',
  'Talha Azeem', (select id from profiles where full_name = 'Talha Azeem'),
  (select id from profiles where full_name = 'Najma Furqan'), '2026-09-12'::date, 'Q1'
union all select 'A15', 'Implement schema markup (Org, Service, FAQ, Breadcrumb)',
  'Usman Ali', (select id from profiles where full_name = 'Usman Ali'),
  (select id from profiles where full_name = 'Talha Azeem'), '2026-09-12'::date, 'Q1'
union all select 'A16', 'Claim software partner directories',
  'Syed Ali', (select id from profiles where full_name = 'Syed Ali'),
  null, '2026-09-12'::date, 'Q1'
union all select 'A17', 'Claim TPM / CPG vendor listings',
  'Syed Ali', (select id from profiles where full_name = 'Syed Ali'),
  null, '2026-09-19'::date, 'Q1'
union all select 'A18', 'Full Ahrefs Site Audit and remediation',
  'Talha Azeem', (select id from profiles where full_name = 'Talha Azeem'),
  (select id from profiles where full_name = 'Usman Ali'), '2026-09-26'::date, 'Q1'
union all select 'A19', 'Optimise all 15 striking-distance pages',
  'Lavi Shamoon', (select id from profiles where full_name = 'Lavi Shamoon'),
  (select id from profiles where full_name = 'Najma Furqan'), '2026-09-30'::date, 'Q1'
union all select 'A20', 'Implement silo internal linking',
  'Talha Azeem', (select id from profiles where full_name = 'Talha Azeem'),
  (select id from profiles where full_name = 'Najma Furqan'), '2026-09-30'::date, 'Q1'
union all select 'A21', 'Join chambers and associations',
  'Syed Ali', (select id from profiles where full_name = 'Syed Ali'),
  (select id from profiles where full_name = 'Haroon'), '2026-09-30'::date, 'Q1'
union all select 'A22', 'Field CPG Benchmark survey',
  'Syed Ali', (select id from profiles where full_name = 'Syed Ali'),
  (select id from profiles where full_name = 'Haroon'), '2026-09-30'::date, 'Q1'
union all select 'A23', 'Optimise 7 non-ranking service pages',
  'Lavi Shamoon', (select id from profiles where full_name = 'Lavi Shamoon'),
  (select id from profiles where full_name = 'Najma Furqan'), '2026-10-31'::date, 'Q2'
union all select 'A24', 'Build interactive calculators',
  'Hameed Ishaq', (select id from profiles where full_name = 'Hameed Ishaq'),
  (select id from profiles where full_name = 'Usman Ali'), '2026-11-30'::date, 'Q2'
union all select 'A25', 'Launch glossary phase 1 (30 terms)',
  'Lavi Shamoon', (select id from profiles where full_name = 'Lavi Shamoon'),
  (select id from profiles where full_name = 'Najma Furqan'), '2026-11-30'::date, 'Q2'
union all select 'A26', 'Publish CPG Finance Benchmark Report',
  'Syed Ali', (select id from profiles where full_name = 'Syed Ali'),
  (select id from profiles where full_name = 'Hameed Ishaq'), '2026-12-31'::date, 'Q2'
union all select 'A27', 'Build 6 pillar pages',
  'Lavi Shamoon', (select id from profiles where full_name = 'Lavi Shamoon'),
  (select id from profiles where full_name = 'Najma Furqan'), '2026-12-31'::date, 'Q2'
union all select 'A28', 'Complete podcast circuit round 1 (8+ appearances)',
  'Syed Ali', (select id from profiles where full_name = 'Syed Ali'),
  null, '2027-01-31'::date, 'Q3'
union all select 'A29', 'Secure contributed columns (Forbes/Entrepreneur/Inc.)',
  'Syed Ali', (select id from profiles where full_name = 'Syed Ali'),
  null, '2027-02-28'::date, 'Q3'
union all select 'A30', 'Glossary phase 2 (expand to 60 terms)',
  'Lavi Shamoon', (select id from profiles where full_name = 'Lavi Shamoon'),
  (select id from profiles where full_name = 'Najma Furqan'), '2027-03-31'::date, 'Q3'
union all select 'A31', 'Conversion optimisation on money pages',
  'Najma Furqan', (select id from profiles where full_name = 'Najma Furqan'),
  (select id from profiles where full_name = 'Abdullah Shekha'), '2027-03-31'::date, 'Q3'
union all select 'A32', 'Second research drop',
  'Syed Ali', (select id from profiles where full_name = 'Syed Ali'),
  (select id from profiles where full_name = 'Hameed Ishaq'), '2027-06-30'::date, 'Q4'
union all select 'A33', 'Glossary phase 3 and vertical expansion (90 terms)',
  'Lavi Shamoon', (select id from profiles where full_name = 'Lavi Shamoon'),
  (select id from profiles where full_name = 'Najma Furqan'), '2027-09-30'::date, 'Q5'
union all select 'A34', 'Re-run full report each quarter',
  'Tabish Khalid', (select id from profiles where full_name = 'Tabish Khalid'),
  (select id from profiles where full_name = 'Abdullah Shekha'), null, 'All';

insert into metric_snapshots (
  snapshot_date, quarter_label, domain_rating, organic_traffic_global, organic_traffic_us,
  organic_keywords_global, organic_keywords_us, keywords_top_3, keywords_top_10,
  traffic_value_monthly, referring_domains_total, referring_domains_quality,
  avg_keywords_per_page, indexed_content_pages, notes
) values (
  '2026-08-23', 'Baseline', 24, 286, 260, 115, 86, 16, 96, 1467, 861, 35, 2.5, 45,
  'Baseline snapshot per CLAUDE.md Section 10.3'
);

insert into audit_reports (title, category, severity, finding, recommendation, assigned_to) values
('Sold-backlink referring domains', 'backlink', 'critical',
 '17 referring domains explicitly advertise selling backlinks (pbnseolinks.shop, buybacklinks.agency, buyseobacklinks.shop, etc.)',
 'Disavow all 17 domains in Search Console', (select id from profiles where full_name = 'Talha Azeem')),
('High-equity URLs redirected', 'technical', 'critical',
 'Two highest-equity URLs (/accounts-payable/, /general-accounting-and-bookkeeping/ at UR 11.7) are 301 redirects',
 'Restore or properly consolidate these URLs', (select id from profiles where full_name = 'Usman Ali')),
('Cloudflare 404 with link equity', 'technical', 'critical',
 '/cdn-cgi/l/email-protection (UR 9.9) returns 404 — Cloudflare artefact with accumulated links',
 'Redirect to a relevant live page', (select id from profiles where full_name = 'Usman Ali')),
('Fractional CFO page redirected', 'technical', 'critical',
 '/fractional-cfo-services/ (UR 9.9) is a 301 redirect — target keyword worth 14,000 searches/mo at $10 CPC',
 'Restore this page as a live, optimised URL', (select id from profiles where full_name = 'Talha Azeem')),
('302 instead of 301 redirect', 'technical', 'high',
 'eaccelerated.com redirects with 302 (temporary) instead of 301 — not consolidating link equity',
 'Change redirect type to 301', (select id from profiles where full_name = 'Usman Ali')),
('HTTP/HTTPS duplication', 'technical', 'high',
 'HTTP and HTTPS versions of pages both return 200 — no canonical consolidation',
 'Force redirect HTTP to HTTPS and set canonical tags', (select id from profiles where full_name = 'Usman Ali')),
('Flat site architecture', 'architecture', 'high',
 'Perfectly flat site architecture — every page at UR 6.9, nothing prioritised',
 'Introduce hub-and-spoke silo structure', (select id from profiles where full_name = 'Talha Azeem')),
('Manufacturing accounting page not ranking', 'content', 'high',
 '/manufacturing-accounting/ exists but ranks for none of its head terms (KD 0)',
 'Rewrite and optimise for target keywords', (select id from profiles where full_name = 'Lavi Shamoon')),
('Ecommerce accounting page not ranking', 'content', 'high',
 '/ecommerce-accounting/ exists but ranks for none of its head terms',
 'Rewrite and optimise for target keywords', (select id from profiles where full_name = 'Lavi Shamoon')),
('Amazon accounting page not ranking', 'content', 'high',
 '/amazon-accounting/ exists but ranks for none of its head terms (KD 0)',
 'Rewrite and optimise for target keywords', (select id from profiles where full_name = 'Lavi Shamoon')),
('TPM page not ranking', 'content', 'high',
 '/trade-promotions-management/ exists but ranks for none of its head terms',
 'Rewrite and optimise for target keywords', (select id from profiles where full_name = 'Lavi Shamoon')),
('Fractional CFO traffic loss', 'content', 'high',
 '/fractional-cfo-services/ (301''d) — 14,000 searches/mo, EA earns zero traffic',
 'Restore and optimise this page', (select id from profiles where full_name = 'Najma Furqan')),
('Keyword cannibalisation', 'technical', 'medium',
 'Keyword cannibalisation: /blog/how-much-does-a-cpa-cost/ vs /cpa-cost/ competing on same intent',
 'Consolidate into a single canonical page', (select id from profiles where full_name = 'Talha Azeem')),
('Duplicate inventory pages', 'technical', 'medium',
 '/inventory-management/ and /inventory-management-services/ duplicated',
 'Merge or differentiate and canonicalise', (select id from profiles where full_name = 'Talha Azeem')),
('Duplicate blog hubs', 'technical', 'medium',
 '/blog/ and /blogs/ both exist — duplicate resource hub',
 'Consolidate into a single blog path with redirects', (select id from profiles where full_name = 'Usman Ali')),
('No hub-and-spoke linking', 'architecture', 'medium',
 'No hub-and-spoke internal linking — service, industry, location pages all isolated',
 'Build internal link matrix per silo', (select id from profiles where full_name = 'Talha Azeem')),
('No schema markup', 'technical', 'medium',
 'No schema markup deployed (Organization, Service, FAQPage, BreadcrumbList)',
 'Implement structured data across key templates', (select id from profiles where full_name = 'Usman Ali'));

insert into tracked_keywords (keyword, priority, category, target_url, monthly_volume, keyword_difficulty, cpc) values
('fractional cfo services', 'high', 'striking-distance', '/fractional-cfo-services/', 14000, 42, 10.50),
('cpa cost', 'high', 'striking-distance', '/cpa-cost/', 2400, 28, 6.20),
('manufacturing accounting', 'high', 'striking-distance', '/manufacturing-accounting/', 880, 22, 8.10),
('ecommerce accounting', 'high', 'striking-distance', '/ecommerce-accounting/', 1600, 31, 7.40),
('amazon accounting', 'medium', 'striking-distance', '/amazon-accounting/', 590, 19, 5.90),
('trade promotions management', 'medium', 'striking-distance', '/trade-promotions-management/', 320, 25, 9.80),
('inventory management services', 'medium', 'striking-distance', '/inventory-management-services/', 1100, 30, 6.60);
