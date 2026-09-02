-- Leads List (Kanban) -- docs/superpowers/specs/2026-09-02-leads-kanban-design.md.
-- Admin-only (role = 'admin' exactly, not head) throughout: RLS below, plus API-level and
-- middleware-level checks in later tasks.

create table lead_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  requires_submission_from boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz default now()
);

create table leads (
  id uuid primary key default gen_random_uuid(),
  stage text not null default 'new_lead'
    check (stage in (
      'new_lead', 'introductory_call', 'followup_1', 'followup_2', 'followup_3', 'won', 'lost'
    )),

  -- New Lead
  lead_date date not null,
  full_name text not null,
  company_name text,
  email text,
  phone_number text,
  revenue numeric,
  service_needed text,
  brand text check (brand in ('workagentic', 'expertise_accelerated')),
  employee_size text,
  source_id uuid references lead_sources(id),
  point_of_contact text,
  submission_from text
    check (submission_from in ('book_a_consultation', 'contact_form', 'chat')),

  -- Introductory Call
  intro_call_date date,
  intro_call_status text check (intro_call_status in ('conducted', 'pending')),
  intro_call_meeting_minutes text,
  intro_call_email_sent text,
  followup_1_scheduled_date date,

  -- 1st Follow-up
  followup_1_date date,
  followup_1_notes text,
  followup_1_email_sent text,
  followup_2_scheduled_date date,

  -- 2nd Follow-up
  followup_2_date date,
  followup_2_notes text,
  followup_2_email_sent text,
  followup_3_scheduled_date date,

  -- 3rd Follow-up
  followup_3_date date,
  followup_3_notes text,
  followup_3_email_sent text,

  -- Won
  won_date date,
  won_notes text,
  conversion_value numeric,

  -- Lost
  lost_date date,
  lost_notes text,

  created_by uuid references profiles(id),
  updated_by uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table lead_sources enable row level security;
alter table leads enable row level security;

-- current_role_name() already exists (migration 0002_rls_policies.sql).
create policy "lead_sources_admin_only" on lead_sources for all using (
  current_role_name() = 'admin'
) with check (current_role_name() = 'admin');

create policy "leads_admin_only" on leads for all using (
  current_role_name() = 'admin'
) with check (current_role_name() = 'admin');

grant select, insert, update, delete on lead_sources to authenticated;
grant select, insert, update, delete on leads to authenticated;
grant all privileges on lead_sources to service_role;
grant all privileges on leads to service_role;
