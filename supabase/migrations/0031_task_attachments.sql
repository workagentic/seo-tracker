-- Screenshot/image attachments for task Comments and Notes (confirmed with Abdullah 3 Sep
-- 2026). First use of Supabase Storage in this project -- CLAUDE.md previously documented "no
-- file upload, no Storage bucket" as a deliberate v1 simplification (Section 8.3's "Link to
-- review" note); this migration adds exactly the bucket needed for pasted screenshots, nothing
-- broader.

-- Public-read bucket: consistent with this app's existing trust model (every route is already
-- behind Supabase Auth; task_comments/tasks.notes are already team-wide readable, and
-- tasks.link_url already points to arbitrary external URLs). Uploads go through
-- app/api/uploads/task-image/route.ts's service-role client (bypasses RLS, same pattern as
-- every other write in this app), so the insert policy below is defense-in-depth, not the
-- actual gate.
insert into storage.buckets (id, name, public)
values ('task-attachments', 'task-attachments', true)
on conflict (id) do nothing;

create policy "task_attachments_insert_authenticated" on storage.objects for insert
  with check (bucket_id = 'task-attachments' and auth.role() = 'authenticated');

-- Comments can carry multiple pasted screenshots (unlike Notes -- see the note at the bottom --
-- Comments is already a thread of discrete messages, so "N attachments per message" fits
-- naturally). Images are fixed once a comment is posted -- editing a comment only edits its
-- text (lib/tasks/permissions.ts's canCommentOnTask, unchanged); to change images, delete and
-- repost.
create table task_comment_images (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid references task_comments(id) on delete cascade,
  image_url text not null,
  created_at timestamptz default now()
);

alter table task_comment_images enable row level security;

-- Same visibility as task_comments itself (Section 4: team-wide read).
create policy "task_comment_images_select_all" on task_comment_images for select using (
  auth.role() = 'authenticated'
);
-- Writes go through app/api/tasks/[id]/comments/route.ts's service-role client (same
-- defense-in-depth caveat as task_comments_insert_authenticated, migration 0016).
create policy "task_comment_images_insert_authenticated" on task_comment_images for insert with check (
  auth.role() = 'authenticated'
);

grant select, insert on task_comment_images to authenticated;
grant all privileges on task_comment_images to service_role;

-- tasks.notes itself needs NO schema change -- it stays `text`, just now stores a minimal-HTML
-- string (<p>/<br>/<img> only, sanitized server-side in app/api/tasks/[id]/route.ts) written by
-- the Tiptap editor instead of plain text. Existing plain-text notes keep working: the client
-- wraps a non-HTML-looking value in a <p> on load (lib/tasks/notes-html.ts).
