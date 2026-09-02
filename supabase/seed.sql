-- Run AFTER scripts/seed-users.ts has created the 9 profiles.

-- Task register: the 92-task, 5-week September production sprint (Staff Docs/All tasks
-- sheet.xlsx, 1 Sep - 30 Sep 2026), which replaced the original 34-action strategy-doc
-- register on 1 Sep 2026 (see supabase/migrations/0014_task_sept_sprint_reload.sql).
insert into tasks (action_number, title, description, category, position_responsible, assigned_to, co_assigned_to, due_date, quarter, notes)
select 'S1', 'Internal Controls & SOX Compliance Services', 'Create parent & child pages with complete meta, H1/H2 structure, internal linking across SILO.', 'Service Pages', 'Tabish & Talha', (select id from profiles where full_name = 'Tabish Khalid'), (select id from profiles where full_name = 'Talha Azeem'), '2026-09-04'::date, 'Q3', null
union all select 'S2', 'External Audit Support', 'Build service page with on-page SEO, schema markup, and cross-links to audit cluster.', 'Service Pages', 'Tabish & Talha', (select id from profiles where full_name = 'Tabish Khalid'), (select id from profiles where full_name = 'Talha Azeem'), '2026-09-04'::date, 'Q3', null
union all select 'S3', 'Internal Audit Support', 'Build service page with on-page SEO, schema markup, and cross-links to audit cluster.', 'Service Pages', 'Tabish & Talha', (select id from profiles where full_name = 'Tabish Khalid'), (select id from profiles where full_name = 'Talha Azeem'), '2026-09-04'::date, 'Q3', null
union all select 'S4', 'Audit Readiness Assessment', 'Build service page with on-page SEO, schema markup, and cross-links to audit cluster.', 'Service Pages', 'Tabish & Talha', (select id from profiles where full_name = 'Tabish Khalid'), (select id from profiles where full_name = 'Talha Azeem'), '2026-09-04'::date, 'Q3', null
union all select 'L1', 'Location Page — United Kingdom', 'Build UK-targeted location page with local schema, hreflang, UK-specific service messaging, and internal links.', 'Location Pages', 'Tabish & Talha', (select id from profiles where full_name = 'Tabish Khalid'), (select id from profiles where full_name = 'Talha Azeem'), '2026-09-04'::date, 'Q3', null
union all select 'B1', 'New Blog 1', 'Research topic, draft, editorial QA via blog-review-seo skill, submit for proofreading.', 'New Blogs', 'Lavi & Najma', (select id from profiles where full_name = 'Lavi Shamoon'), (select id from profiles where full_name = 'Najma Furqan'), '2026-09-04'::date, 'Q3', null
union all select 'B2', 'New Blog 2', 'Research topic, draft, editorial QA, submit for proofreading.', 'New Blogs', 'Lavi & Najma', (select id from profiles where full_name = 'Lavi Shamoon'), (select id from profiles where full_name = 'Najma Furqan'), '2026-09-04'::date, 'Q3', null
union all select 'R1', 'Revamp Existing Blog 1', 'Audit current post, rewrite for AI Overviews / LLM citation, refresh meta, add internal links.', 'Blog Revamp', 'Tabish', (select id from profiles where full_name = 'Tabish Khalid'), null, '2026-09-04'::date, 'Q3', null
union all select 'R2', 'Revamp Existing Blog 2', 'Audit, rewrite for AEO/GEO, refresh meta, add internal links.', 'Blog Revamp', 'Tabish', (select id from profiles where full_name = 'Tabish Khalid'), null, '2026-09-04'::date, 'Q3', null
union all select 'P1', 'Proofread Blog 1', 'Review draft from Lavi/Najma — check grammar, keyword placement, readability, SEO compliance.', 'Proofreading', 'Tabish', (select id from profiles where full_name = 'Tabish Khalid'), null, '2026-09-04'::date, 'Q3', 'After B1 delivery'
union all select 'PB1', 'Publish Blog 1', 'Final review, upload to CMS, set meta/schema, verify internal links, publish live.', 'Publishing', 'Tabish', (select id from profiles where full_name = 'Tabish Khalid'), null, '2026-09-04'::date, 'Q3', 'After P1 approval'
union all select 'D1', 'New blog image — Blog 1', 'Design featured image + in-post graphics for new Blog 1.', 'Design / Images', 'Hameed', (select id from profiles where full_name = 'Hameed Ishaq'), null, '2026-09-04'::date, 'Q3', 'Deliver before publish'
union all select 'D2', 'New blog image — Blog 2', 'Design featured image + in-post graphics for new Blog 2.', 'Design / Images', 'Hameed', (select id from profiles where full_name = 'Hameed Ishaq'), null, '2026-09-04'::date, 'Q3', null
union all select 'DR1', 'Revamp blog image — Blog 1', 'Update/replace featured image and in-post graphics for revamped Blog 1.', 'Design / Images', 'Hameed', (select id from profiles where full_name = 'Hameed Ishaq'), null, '2026-09-04'::date, 'Q3', null
union all select 'DR2', 'Revamp blog image — Blog 2', 'Update/replace featured image and in-post graphics for revamped Blog 2.', 'Design / Images', 'Hameed', (select id from profiles where full_name = 'Hameed Ishaq'), null, '2026-09-04'::date, 'Q3', null
union all select 'T1', 'Fix 404 errors', 'Crawl site with Screaming Frog / Ahrefs; identify all 404s; set up 301 redirects or restore pages.', 'Technical SEO', 'Tabish & Usman', (select id from profiles where full_name = 'Tabish Khalid'), (select id from profiles where full_name = 'Usman Ali'), '2026-09-04'::date, 'Q3', 'Priority: fix broken UX first'
union all select 'A16-W1', 'Claim software partner directories', 'Complete partner/certification profiles: NetSuite, Sage Intacct, QuickBooks ProAdvisor, Xero Partner, Bill.com, Ramp, Brex.', 'Links', 'Syed Ali', (select id from profiles where full_name = 'Syed Ali'), null, '2026-09-04'::date, 'Q3', null
union all select 'O4', 'Industry / partner outreach', 'Begin outreach to industry contacts and potential partners for link-building and co-marketing.', 'Off-Page SEO', 'Talha', (select id from profiles where full_name = 'Talha Azeem'), null, '2026-09-04'::date, 'Q3', 'Continuous through Sep'
union all select 'S5', 'Internal Controls Design & Testing', 'Build service page with on-page SEO, link to SOX parent page, schema markup.', 'Service Pages', 'Tabish & Talha', (select id from profiles where full_name = 'Tabish Khalid'), (select id from profiles where full_name = 'Talha Azeem'), '2026-09-11'::date, 'Q3', null
union all select 'S6', 'Accounts Payable Services', 'Create AP parent page with meta, internal links to AP child pages.', 'Service Pages', 'Tabish & Talha', (select id from profiles where full_name = 'Tabish Khalid'), (select id from profiles where full_name = 'Talha Azeem'), '2026-09-11'::date, 'Q3', null
union all select 'S7', 'Invoice Processing & 3-Way Matching', 'Build child page under AP cluster with process-focused content and internal links.', 'Service Pages', 'Tabish & Talha', (select id from profiles where full_name = 'Tabish Khalid'), (select id from profiles where full_name = 'Talha Azeem'), '2026-09-11'::date, 'Q3', null
union all select 'S8', 'Vendor Management Services', 'Build child page under AP cluster with vendor lifecycle content and internal links.', 'Service Pages', 'Tabish & Talha', (select id from profiles where full_name = 'Tabish Khalid'), (select id from profiles where full_name = 'Talha Azeem'), '2026-09-11'::date, 'Q3', null
union all select 'L2', 'Location Page — Germany', 'Build Germany-targeted location page with local schema, hreflang, DE-specific messaging, and internal links.', 'Location Pages', 'Tabish & Talha', (select id from profiles where full_name = 'Tabish Khalid'), (select id from profiles where full_name = 'Talha Azeem'), '2026-09-11'::date, 'Q3', null
union all select 'B3', 'New Blog 3', 'Research topic, draft, editorial QA, submit for proofreading.', 'New Blogs', 'Lavi & Najma', (select id from profiles where full_name = 'Lavi Shamoon'), (select id from profiles where full_name = 'Najma Furqan'), '2026-09-11'::date, 'Q3', null
union all select 'B4', 'New Blog 4', 'Research topic, draft, editorial QA, submit for proofreading.', 'New Blogs', 'Lavi & Najma', (select id from profiles where full_name = 'Lavi Shamoon'), (select id from profiles where full_name = 'Najma Furqan'), '2026-09-11'::date, 'Q3', null
union all select 'R3', 'Revamp Existing Blog 3', 'Audit, rewrite for AEO/GEO, refresh meta, add internal links.', 'Blog Revamp', 'Tabish', (select id from profiles where full_name = 'Tabish Khalid'), null, '2026-09-11'::date, 'Q3', null
union all select 'R4', 'Revamp Existing Blog 4', 'Audit, rewrite for AEO/GEO, refresh meta, add internal links.', 'Blog Revamp', 'Tabish', (select id from profiles where full_name = 'Tabish Khalid'), null, '2026-09-11'::date, 'Q3', null
union all select 'P2', 'Proofread Blog 2', 'Review draft from Lavi/Najma — check grammar, keyword placement, readability, SEO compliance.', 'Proofreading', 'Tabish', (select id from profiles where full_name = 'Tabish Khalid'), null, '2026-09-11'::date, 'Q3', null
union all select 'PB2', 'Publish Blog 2', 'Final review, upload to CMS, set meta/schema, verify internal links, publish live.', 'Publishing', 'Tabish', (select id from profiles where full_name = 'Tabish Khalid'), null, '2026-09-11'::date, 'Q3', null
union all select 'P3', 'Proofread Blog 3', 'Review draft — grammar, keyword placement, readability, SEO compliance.', 'Proofreading', 'Tabish', (select id from profiles where full_name = 'Tabish Khalid'), null, '2026-09-11'::date, 'Q3', null
union all select 'PB3', 'Publish Blog 3', 'Final review, upload to CMS, set meta/schema, verify internal links, publish live.', 'Publishing', 'Tabish', (select id from profiles where full_name = 'Tabish Khalid'), null, '2026-09-11'::date, 'Q3', null
union all select 'D3', 'New blog image — Blog 3', 'Design featured image + in-post graphics for new Blog 3.', 'Design / Images', 'Hameed', (select id from profiles where full_name = 'Hameed Ishaq'), null, '2026-09-11'::date, 'Q3', null
union all select 'D4', 'New blog image — Blog 4', 'Design featured image + in-post graphics for new Blog 4.', 'Design / Images', 'Hameed', (select id from profiles where full_name = 'Hameed Ishaq'), null, '2026-09-11'::date, 'Q3', null
union all select 'DR3', 'Revamp blog image — Blog 3', 'Update/replace featured image and in-post graphics for revamped Blog 3.', 'Design / Images', 'Hameed', (select id from profiles where full_name = 'Hameed Ishaq'), null, '2026-09-11'::date, 'Q3', null
union all select 'DR4', 'Revamp blog image — Blog 4', 'Update/replace featured image and in-post graphics for revamped Blog 4.', 'Design / Images', 'Hameed', (select id from profiles where full_name = 'Hameed Ishaq'), null, '2026-09-11'::date, 'Q3', null
union all select 'T2', 'Audit & fix redirects', 'Map all redirect chains and loops; consolidate to single-hop 301s; update internal links pointing to redirected URLs.', 'Technical SEO', 'Tabish & Usman', (select id from profiles where full_name = 'Tabish Khalid'), (select id from profiles where full_name = 'Usman Ali'), '2026-09-11'::date, 'Q3', null
union all select 'W1', 'Service pages & location page publishing', 'Publish service pages with provided data, implement redirections, add metas, ctas, navbar/footer links update', 'Website', 'Tabish & Usman', (select id from profiles where full_name = 'Tabish Khalid'), (select id from profiles where full_name = 'Usman Ali'), '2026-09-11'::date, 'Q3', null
union all select 'A16-W2', 'Claim software partner directories', 'Complete partner/certification profiles: NetSuite, Sage Intacct, QuickBooks ProAdvisor, Xero Partner, Bill.com, Ramp, Brex.', 'Links', 'Syed Ali', (select id from profiles where full_name = 'Syed Ali'), null, '2026-09-11'::date, 'Q3', null
union all select 'O1', 'Paid Guest Post 1', 'Identify target publication, pitch topic, write guest post with backlink, get published.', 'Off-Page SEO', 'Talha & Najma', (select id from profiles where full_name = 'Talha Azeem'), (select id from profiles where full_name = 'Najma Furqan'), '2026-09-11'::date, 'Q3', null
union all select 'S9', 'Accounts Receivable Services', 'Create AR parent page with meta, internal links to AR child pages.', 'Service Pages', 'Tabish & Talha', (select id from profiles where full_name = 'Tabish Khalid'), (select id from profiles where full_name = 'Talha Azeem'), '2026-09-18'::date, 'Q3', null
union all select 'S10', 'Collections & Cash Application Services', 'Build child page under AR cluster with process content and links back to AR parent.', 'Service Pages', 'Tabish & Talha', (select id from profiles where full_name = 'Tabish Khalid'), (select id from profiles where full_name = 'Talha Azeem'), '2026-09-18'::date, 'Q3', null
union all select 'S11', 'Payroll Services', 'Build standalone service page with full meta, schema, cross-links to finance ops cluster.', 'Service Pages', 'Tabish & Talha', (select id from profiles where full_name = 'Tabish Khalid'), (select id from profiles where full_name = 'Talha Azeem'), '2026-09-18'::date, 'Q3', null
union all select 'S12', 'AP & AR Automation Consulting', 'Build service page bridging AP/AR clusters; link to both parent pages.', 'Service Pages', 'Tabish & Talha', (select id from profiles where full_name = 'Tabish Khalid'), (select id from profiles where full_name = 'Talha Azeem'), '2026-09-18'::date, 'Q3', null
union all select 'L3', 'Location Page — Switzerland', 'Build Switzerland-targeted location page with local schema, hreflang, CH-specific messaging.', 'Location Pages', 'Tabish & Talha', (select id from profiles where full_name = 'Tabish Khalid'), (select id from profiles where full_name = 'Talha Azeem'), '2026-09-18'::date, 'Q3', null
union all select 'B5', 'New Blog 5', 'Research topic, draft, editorial QA, submit for proofreading.', 'New Blogs', 'Lavi & Najma', (select id from profiles where full_name = 'Lavi Shamoon'), (select id from profiles where full_name = 'Najma Furqan'), '2026-09-18'::date, 'Q3', null
union all select 'B6', 'New Blog 6', 'Research topic, draft, editorial QA, submit for proofreading.', 'New Blogs', 'Lavi & Najma', (select id from profiles where full_name = 'Lavi Shamoon'), (select id from profiles where full_name = 'Najma Furqan'), '2026-09-18'::date, 'Q3', null
union all select 'R5', 'Revamp Existing Blog 5', 'Audit, rewrite for AEO/GEO, refresh meta, add internal links.', 'Blog Revamp', 'Tabish', (select id from profiles where full_name = 'Tabish Khalid'), null, '2026-09-18'::date, 'Q3', null
union all select 'R6', 'Revamp Existing Blog 6', 'Audit, rewrite for AEO/GEO, refresh meta, add internal links.', 'Blog Revamp', 'Tabish', (select id from profiles where full_name = 'Tabish Khalid'), null, '2026-09-18'::date, 'Q3', null
union all select 'P4', 'Proofread Blog 4', 'Review draft — grammar, keyword placement, readability, SEO compliance.', 'Proofreading', 'Tabish', (select id from profiles where full_name = 'Tabish Khalid'), null, '2026-09-18'::date, 'Q3', null
union all select 'PB4', 'Publish Blog 4', 'Final review, upload to CMS, set meta/schema, verify internal links, publish live.', 'Publishing', 'Tabish', (select id from profiles where full_name = 'Tabish Khalid'), null, '2026-09-18'::date, 'Q3', null
union all select 'P5', 'Proofread Blog 5', 'Review draft — grammar, keyword placement, readability, SEO compliance.', 'Proofreading', 'Tabish', (select id from profiles where full_name = 'Tabish Khalid'), null, '2026-09-18'::date, 'Q3', null
union all select 'PB5', 'Publish Blog 5', 'Final review, upload to CMS, set meta/schema, verify internal links, publish live.', 'Publishing', 'Tabish', (select id from profiles where full_name = 'Tabish Khalid'), null, '2026-09-18'::date, 'Q3', null
union all select 'D5', 'New blog image — Blog 5', 'Design featured image + in-post graphics for new Blog 5.', 'Design / Images', 'Hameed', (select id from profiles where full_name = 'Hameed Ishaq'), null, '2026-09-18'::date, 'Q3', null
union all select 'D6', 'New blog image — Blog 6', 'Design featured image + in-post graphics for new Blog 6.', 'Design / Images', 'Hameed', (select id from profiles where full_name = 'Hameed Ishaq'), null, '2026-09-18'::date, 'Q3', null
union all select 'DR5', 'Revamp blog image — Blog 5', 'Update/replace featured image and in-post graphics for revamped Blog 5.', 'Design / Images', 'Hameed', (select id from profiles where full_name = 'Hameed Ishaq'), null, '2026-09-18'::date, 'Q3', null
union all select 'DR6', 'Revamp blog image — Blog 6', 'Update/replace featured image and in-post graphics for revamped Blog 6.', 'Design / Images', 'Hameed', (select id from profiles where full_name = 'Hameed Ishaq'), null, '2026-09-18'::date, 'Q3', null
union all select 'T3', 'Core Web Vitals optimization', 'Run Lighthouse / PageSpeed Insights; fix LCP, INP, CLS issues; compress images, defer JS, optimize CSS.', 'Technical SEO', 'Tabish & Usman', (select id from profiles where full_name = 'Tabish Khalid'), (select id from profiles where full_name = 'Usman Ali'), '2026-09-18'::date, 'Q3', null
union all select 'W2', 'Service pages & location page publishing', 'Publish service pages with provided data, implement redirections, add metas, ctas, navbar/footer links update', 'Website', 'Tabish & Usman', (select id from profiles where full_name = 'Tabish Khalid'), (select id from profiles where full_name = 'Usman Ali'), '2026-09-18'::date, 'Q3', null
union all select 'A16-W3', 'Claim software partner directories', 'Complete partner/certification profiles: NetSuite, Sage Intacct, QuickBooks ProAdvisor, Xero Partner, Bill.com, Ramp, Brex.', 'Links', 'Syed Ali', (select id from profiles where full_name = 'Syed Ali'), null, '2026-09-18'::date, 'Q3', null
union all select 'O3', 'PR Submission', 'Draft press release, submit to distribution service, track pickup and backlinks.', 'Off-Page SEO', 'Talha', (select id from profiles where full_name = 'Talha Azeem'), null, '2026-09-18'::date, 'Q3', null
union all select 'S13', 'Inventory Management Services', 'Build service page with supply chain focus, internal links to demand planning and trade promo pages.', 'Service Pages', 'Tabish & Talha', (select id from profiles where full_name = 'Tabish Khalid'), (select id from profiles where full_name = 'Talha Azeem'), '2026-09-25'::date, 'Q3', null
union all select 'S14', 'Trade Promotions Management', 'Build child page under inventory/supply chain cluster.', 'Service Pages', 'Tabish & Talha', (select id from profiles where full_name = 'Tabish Khalid'), (select id from profiles where full_name = 'Talha Azeem'), '2026-09-25'::date, 'Q3', null
union all select 'S15', 'Demand & Supply Planning', 'Build child page under inventory/supply chain cluster.', 'Service Pages', 'Tabish & Talha', (select id from profiles where full_name = 'Tabish Khalid'), (select id from profiles where full_name = 'Talha Azeem'), '2026-09-25'::date, 'Q3', null
union all select 'S16', 'Deductions & Chargeback Management', 'Build service page with deductions workflow content and links to AR/AP clusters.', 'Service Pages', 'Tabish & Talha', (select id from profiles where full_name = 'Tabish Khalid'), (select id from profiles where full_name = 'Talha Azeem'), '2026-09-25'::date, 'Q3', null
union all select 'L4', 'Location Page — Sweden', 'Build Sweden-targeted location page with local schema, hreflang, SE-specific messaging.', 'Location Pages', 'Tabish & Talha', (select id from profiles where full_name = 'Tabish Khalid'), (select id from profiles where full_name = 'Talha Azeem'), '2026-09-25'::date, 'Q3', null
union all select 'B7', 'New Blog 7', 'Research topic, draft, editorial QA, submit for proofreading.', 'New Blogs', 'Lavi & Najma', (select id from profiles where full_name = 'Lavi Shamoon'), (select id from profiles where full_name = 'Najma Furqan'), '2026-09-25'::date, 'Q3', null
union all select 'B8', 'New Blog 8', 'Research topic, draft, editorial QA, submit for proofreading.', 'New Blogs', 'Lavi & Najma', (select id from profiles where full_name = 'Lavi Shamoon'), (select id from profiles where full_name = 'Najma Furqan'), '2026-09-25'::date, 'Q3', null
union all select 'R7', 'Revamp Existing Blog 7', 'Audit, rewrite for AEO/GEO, refresh meta, add internal links.', 'Blog Revamp', 'Tabish', (select id from profiles where full_name = 'Tabish Khalid'), null, '2026-09-25'::date, 'Q3', null
union all select 'R8', 'Revamp Existing Blog 8', 'Audit, rewrite for AEO/GEO, refresh meta, add internal links.', 'Blog Revamp', 'Tabish', (select id from profiles where full_name = 'Tabish Khalid'), null, '2026-09-25'::date, 'Q3', null
union all select 'P6', 'Proofread Blog 6', 'Review draft — grammar, keyword placement, readability, SEO compliance.', 'Proofreading', 'Tabish', (select id from profiles where full_name = 'Tabish Khalid'), null, '2026-09-25'::date, 'Q3', null
union all select 'PB6', 'Publish Blog 6', 'Final review, upload to CMS, set meta/schema, verify internal links, publish live.', 'Publishing', 'Tabish', (select id from profiles where full_name = 'Tabish Khalid'), null, '2026-09-25'::date, 'Q3', null
union all select 'P7', 'Proofread Blog 7', 'Review draft — grammar, keyword placement, readability, SEO compliance.', 'Proofreading', 'Tabish', (select id from profiles where full_name = 'Tabish Khalid'), null, '2026-09-25'::date, 'Q3', null
union all select 'PB7', 'Publish Blog 7', 'Final review, upload to CMS, set meta/schema, verify internal links, publish live.', 'Publishing', 'Tabish', (select id from profiles where full_name = 'Tabish Khalid'), null, '2026-09-25'::date, 'Q3', null
union all select 'D7', 'New blog image — Blog 7', 'Design featured image + in-post graphics for new Blog 7.', 'Design / Images', 'Hameed', (select id from profiles where full_name = 'Hameed Ishaq'), null, '2026-09-25'::date, 'Q3', null
union all select 'D8', 'New blog image — Blog 8', 'Design featured image + in-post graphics for new Blog 8.', 'Design / Images', 'Hameed', (select id from profiles where full_name = 'Hameed Ishaq'), null, '2026-09-25'::date, 'Q3', null
union all select 'DR7', 'Revamp blog image — Blog 7', 'Update/replace featured image and in-post graphics for revamped Blog 7.', 'Design / Images', 'Hameed', (select id from profiles where full_name = 'Hameed Ishaq'), null, '2026-09-25'::date, 'Q3', null
union all select 'DR8', 'Revamp blog image — Blog 8', 'Update/replace featured image and in-post graphics for revamped Blog 8.', 'Design / Images', 'Hameed', (select id from profiles where full_name = 'Hameed Ishaq'), null, '2026-09-25'::date, 'Q3', null
union all select 'T4', 'Crawling & indexing fixes', 'Review robots.txt, crawl budget; check GSC index coverage; fix noindex tags, canonical issues; submit updated sitemap.', 'Technical SEO', 'Tabish & Usman', (select id from profiles where full_name = 'Tabish Khalid'), (select id from profiles where full_name = 'Usman Ali'), '2026-09-25'::date, 'Q3', null
union all select 'W3', 'Service pages & location page publishing', 'Publish service pages with provided data, implement redirections, add metas, ctas, navbar/footer links update', 'Website', 'Tabish & Usman', (select id from profiles where full_name = 'Tabish Khalid'), (select id from profiles where full_name = 'Usman Ali'), '2026-09-25'::date, 'Q3', null
union all select 'A16-W4', 'Claim software partner directories', 'Complete partner/certification profiles: NetSuite, Sage Intacct, QuickBooks ProAdvisor, Xero Partner, Bill.com, Ramp, Brex.', 'Links', 'Syed Ali', (select id from profiles where full_name = 'Syed Ali'), null, '2026-09-25'::date, 'Q3', null
union all select 'O2', 'Paid Guest Post 2', 'Identify target publication, pitch topic, write guest post with backlink, get published.', 'Off-Page SEO', 'Talha', (select id from profiles where full_name = 'Talha Azeem'), null, '2026-09-25'::date, 'Q3', null
union all select 'S17', 'Business Process Optimization', 'Build cross-cutting service page linking to multiple SILO clusters.', 'Service Pages', 'Tabish & Talha', (select id from profiles where full_name = 'Tabish Khalid'), (select id from profiles where full_name = 'Talha Azeem'), '2026-09-30'::date, 'Q3', null
union all select 'S18', 'Finance System Implementation Support', 'Build service page with ERP/system focus, internal links across all relevant SILOs.', 'Service Pages', 'Tabish & Talha', (select id from profiles where full_name = 'Tabish Khalid'), (select id from profiles where full_name = 'Talha Azeem'), '2026-09-30'::date, 'Q3', null
union all select 'R9', 'Revamp Existing Blog 9', 'Audit, rewrite for AEO/GEO, refresh meta, add internal links.', 'Blog Revamp', 'Tabish', (select id from profiles where full_name = 'Tabish Khalid'), null, '2026-09-30'::date, 'Q3', null
union all select 'R10', 'Revamp Existing Blog 10', 'Audit, rewrite for AEO/GEO, refresh meta, add internal links.', 'Blog Revamp', 'Tabish', (select id from profiles where full_name = 'Tabish Khalid'), null, '2026-09-30'::date, 'Q3', null
union all select 'P8', 'Proofread Blog 8', 'Review draft — grammar, keyword placement, readability, SEO compliance.', 'Proofreading', 'Tabish', (select id from profiles where full_name = 'Tabish Khalid'), null, '2026-09-30'::date, 'Q3', null
union all select 'PB8', 'Publish Blog 8', 'Final review, upload to CMS, set meta/schema, verify internal links, publish live.', 'Publishing', 'Tabish', (select id from profiles where full_name = 'Tabish Khalid'), null, '2026-09-30'::date, 'Q3', null
union all select 'DR9', 'Revamp blog image — Blog 9', 'Update/replace featured image and in-post graphics for revamped Blog 9.', 'Design / Images', 'Hameed', (select id from profiles where full_name = 'Hameed Ishaq'), null, '2026-09-30'::date, 'Q3', null
union all select 'DR10', 'Revamp blog image — Blog 10', 'Update/replace featured image and in-post graphics for revamped Blog 10.', 'Design / Images', 'Hameed', (select id from profiles where full_name = 'Hameed Ishaq'), null, '2026-09-30'::date, 'Q3', null
union all select 'T5', 'Schema markup implementation', 'Implement JSON-LD structured data across service pages, location pages, and blog posts (Organization, Service, LocalBusiness, Article schemas).', 'Technical SEO', 'Tabish & Usman', (select id from profiles where full_name = 'Tabish Khalid'), (select id from profiles where full_name = 'Usman Ali'), '2026-09-30'::date, 'Q3', 'After all new pages are live'
union all select 'A16-W5', 'Claim software partner directories', 'Complete partner/certification profiles: NetSuite, Sage Intacct, QuickBooks ProAdvisor, Xero Partner, Bill.com, Ramp, Brex.', 'Links', 'Syed Ali', (select id from profiles where full_name = 'Syed Ali'), null, '2026-09-30'::date, 'Q3', null
union all select 'W4', 'Service pages & location page publishing', 'Publish service pages with provided data, implement redirections, add metas, ctas, navbar/footer links update', 'Website', 'Tabish & Usman', (select id from profiles where full_name = 'Tabish Khalid'), (select id from profiles where full_name = 'Usman Ali'), '2026-09-30'::date, 'Q3', null;

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

insert into lead_sources (name, requires_submission_from) values
  ('Direct', true),
  ('SEO', true),
  ('LinkedIn', false),
  ('Upwork', false);
