-- Attachment/link field (Staff Docs/further_recs_mockup.html #2). Link-only, no file upload --
-- there's no Supabase Storage bucket set up in this project yet, and a plain URL covers the
-- mockup's "link to the live page / doc / screenshot" use case without new infrastructure.
alter table tasks add column link_url text;
