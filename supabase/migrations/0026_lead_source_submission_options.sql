-- Phase 4 of the Task Tracker/Quarter overhaul (CLAUDE.md Section 14): the "Submission From"
-- options on a lead were a hardcoded 3-value enum ('book_a_consultation'/'contact_form'/
-- 'chat') shared globally across every lead source. They become admin-editable and per-source
-- instead -- each lead_sources row gets its own independent list of options.

create table lead_source_submission_options (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references lead_sources(id) on delete cascade,
  label text not null,
  is_active boolean not null default true,
  created_at timestamptz default now()
);

alter table lead_source_submission_options enable row level security;

-- Same admin-only-throughout convention as the rest of Leads (Section 5.17).
create policy "lead_source_submission_options_admin_only" on lead_source_submission_options for all using (
  current_role_name() = 'admin'
) with check (current_role_name() = 'admin');

grant select, insert, update, delete on lead_source_submission_options to authenticated;
grant all privileges on lead_source_submission_options to service_role;

-- Seed the same 3 options the app used to hardcode, for every existing source that already
-- requires submission_from, so existing leads/forms don't regress.
insert into lead_source_submission_options (source_id, label)
select id, 'Book A Consultation' from lead_sources where requires_submission_from = true
union all
select id, 'Contact Form' from lead_sources where requires_submission_from = true
union all
select id, 'Chat' from lead_sources where requires_submission_from = true;

alter table leads add column submission_from_id uuid references lead_source_submission_options(id);

update leads set submission_from_id = (
  select o.id from lead_source_submission_options o
  where o.source_id = leads.source_id
    and o.label = case leads.submission_from
      when 'book_a_consultation' then 'Book A Consultation'
      when 'contact_form' then 'Contact Form'
      when 'chat' then 'Chat'
    end
  limit 1
)
where submission_from is not null;

alter table leads drop column submission_from;
