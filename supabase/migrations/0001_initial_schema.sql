create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('admin', 'head', 'owner', 'leadership')),
  job_title text,
  section_owner text,
  avatar_url text,
  is_active boolean not null default true,
  created_at timestamptz default now()
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  action_number text not null,
  title text not null,
  description text,
  position_responsible text,
  assigned_to uuid references profiles(id),
  co_assigned_to uuid references profiles(id),
  due_date date,
  status text not null default 'pending'
    check (status in ('pending', 'in_progress', 'completed', 'blocked', 'overdue')),
  quarter text,
  notes text,
  completed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table metric_snapshots (
  id uuid primary key default gen_random_uuid(),
  snapshot_date date not null,
  quarter_label text,
  domain_rating integer,
  organic_traffic_global integer,
  organic_traffic_us integer,
  organic_keywords_global integer,
  organic_keywords_us integer,
  keywords_top_3 integer,
  keywords_top_10 integer,
  traffic_value_monthly numeric,
  referring_domains_total integer,
  referring_domains_quality integer,
  avg_keywords_per_page numeric,
  indexed_content_pages integer,
  notes text,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

create table competitors (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  domain text not null unique,
  domain_rating integer,
  organic_traffic integer,
  organic_keywords integer,
  keywords_top_3 integer,
  est_traffic_value numeric,
  referring_domains integer,
  last_synced_at timestamptz,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table tracked_keywords (
  id uuid primary key default gen_random_uuid(),
  keyword text not null,
  priority text check (priority in ('high', 'medium', 'low')),
  category text,
  target_url text,
  monthly_volume integer,
  keyword_difficulty integer,
  cpc numeric,
  current_position integer,
  previous_position integer,
  position_updated_at timestamptz,
  notes text,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table keyword_history (
  id uuid primary key default gen_random_uuid(),
  keyword_id uuid references tracked_keywords(id) on delete cascade,
  recorded_at date not null,
  position integer,
  url text
);

create table audit_reports (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text,
  severity text check (severity in ('critical', 'high', 'medium', 'low')),
  finding text not null,
  recommendation text,
  assigned_to uuid references profiles(id),
  status text default 'open'
    check (status in ('open', 'in_progress', 'resolved', 'wont_fix')),
  resolved_at timestamptz,
  created_at timestamptz default now()
);

create table weekly_reports (
  id uuid primary key default gen_random_uuid(),
  week_start date not null,
  week_end date not null,
  generated_at timestamptz default now(),
  summary jsonb,
  recipient_ids uuid[]
);
