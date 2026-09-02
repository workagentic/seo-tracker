-- Per-user read/unread state for notification-bell entries. Notifications themselves are
-- computed live from tasks/comments (lib/notifications.ts), not stored rows, so this tracks
-- which computed notifications a user has marked read by a stable key (see
-- lib/notifications.ts's notificationKey()) rather than by a foreign key to an event row.
create table notification_reads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) not null,
  notification_key text not null,
  read_at timestamptz default now(),
  unique (user_id, notification_key)
);

alter table notification_reads enable row level security;

-- Personal, low-privilege data -- each user can only see/change their own read state.
create policy "notification_reads_select_own" on notification_reads for select using (
  auth.uid() = user_id
);
create policy "notification_reads_insert_own" on notification_reads for insert with check (
  auth.uid() = user_id
);
create policy "notification_reads_delete_own" on notification_reads for delete using (
  auth.uid() = user_id
);

grant select, insert, delete on notification_reads to authenticated;
grant all privileges on notification_reads to service_role;
