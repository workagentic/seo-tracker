-- Adds a structured category to tasks (e.g. "Service Pages", "Technical SEO"), sourced from
-- the September production sprint sheet (Staff Docs/All tasks sheet.xlsx). Previously there was
-- no field for this -- only `quarter`, which serves a different purpose (Q1-Q5 windows).
alter table tasks add column category text;
