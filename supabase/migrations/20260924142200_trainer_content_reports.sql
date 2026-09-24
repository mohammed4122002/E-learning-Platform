-- TRR-RPT-01/02 · Reports on the trainer's content (existing violation_reports), the trainer's response,
-- the compliance decision and one appeal per decision (7 days, reviewed by someone who did not take the first
-- decision). The trainer never sees reporter_id: reads go through security-definer functions that omit it.

-- ── violation_reports: public number + program targets ─────────────────────────
create sequence public.violation_report_number_seq;
alter table public.violation_reports add column if not exists report_number bigint;
-- Number existing rows in creation order, then default new rows.
update public.violation_reports v set report_number = n.rn
from (select id, row_number() over (order by created_at, id) as rn from public.violation_reports) n
where v.id = n.id and v.report_number is null;
select setval('public.violation_report_number_seq', coalesce((select max(report_number) from public.violation_reports), 0) + 1, false);
alter table public.violation_reports alter column report_number set default nextval('public.violation_report_number_seq');
alter table public.violation_reports alter column report_number set not null;
create unique index if not exists violation_reports_number_key on public.violation_reports (report_number);
create index if not exists violation_reports_target_idx on public.violation_reports (target_type, target_id);
create index if not exists violation_reports_reporter_idx on public.violation_reports (reporter_id);

alter table public.violation_reports drop constraint if exists violation_reports_target_type_check;
alter table public.violation_reports add constraint violation_reports_target_type_check
  check (target_type in ('course', 'trainer', 'organization', 'review', 'message', 'program'));

-- ── Owner of the reported content ───────────────────────────────────────────
create or replace function public.report_target_trainer(p_report uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select case r.target_type
    when 'course' then (select c.trainer_id from public.courses c where c.id = r.target_id)
    when 'program' then (select p.owner_id from public.programs p where p.id = r.target_id)
    when 'trainer' then r.target_id
  end
  from public.violation_reports r where r.id = p_report;
$$;

create or replace function public.owns_reported_content(p_report uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.report_target_trainer(p_report) = auth.uid();
$$;

-- ── Tables ───────────────────────────────────────────────────────────────────
create table public.report_responses (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null unique references public.violation_reports (id) on delete cascade,
  trainer_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  admitted boolean not null default false,
  attachments jsonb not null default '[]'::jsonb check (jsonb_typeof(attachments) = 'array'),
  created_at timestamptz not null default now()
);
create index report_responses_trainer_idx on public.report_responses (trainer_id);

create table public.report_decisions (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null unique references public.violation_reports (id) on delete cascade,
  outcome text not null check (outcome in ('upheld', 'partially_upheld', 'dismissed')),
  summary text not null check (char_length(summary) between 5 and 4000),
  violation_recorded boolean not null default false,
  decided_by uuid references public.profiles (id) on delete set null,
  decided_at timestamptz not null default now(),
  appeal_deadline timestamptz not null,
  accepted_at timestamptz
);
create index report_decisions_decided_by_idx on public.report_decisions (decided_by);

create table public.report_appeals (
  id uuid primary key default gen_random_uuid(),
  decision_id uuid not null unique references public.report_decisions (id) on delete cascade,
  report_id uuid not null references public.violation_reports (id) on delete cascade,
  trainer_id uuid not null references public.profiles (id) on delete cascade,
  basis text not null check (basis in ('new_evidence', 'fact_error', 'disproportionate')),
  body text not null check (char_length(body) between 20 and 4000),
  attachments jsonb not null default '[]'::jsonb check (jsonb_typeof(attachments) = 'array'),
  acknowledged boolean not null check (acknowledged),
  status text not null default 'pending' check (status in ('pending', 'upheld', 'rejected')),
  submitted_at timestamptz not null default now(),
  decided_by uuid references public.profiles (id) on delete set null,
  decided_at timestamptz,
  decision_note text check (char_length(decision_note) <= 4000)
);
create index report_appeals_report_idx on public.report_appeals (report_id);
create index report_appeals_trainer_idx on public.report_appeals (trainer_id);
create index report_appeals_decided_by_idx on public.report_appeals (decided_by);

alter table public.report_responses enable row level security;
alter table public.report_decisions enable row level security;
alter table public.report_appeals enable row level security;

create policy report_responses_read on public.report_responses for select to authenticated
  using (trainer_id = (select auth.uid()) or public.is_admin());
create policy report_decisions_read on public.report_decisions for select to authenticated
  using (public.owns_reported_content(report_id) or public.is_admin());
create policy report_appeals_read on public.report_appeals for select to authenticated
  using (trainer_id = (select auth.uid()) or public.is_admin());

-- Evidence files (response/appeal attachments) live in the private report-evidence bucket under <uid>/…;
-- allow the document types the Figma copy mentions (attendance sheets, session plans).
update storage.buckets
set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
where id = 'report-evidence';

-- ── Read model for the trainer (no reporter identity) ────────────────────────
create or replace function public.my_content_reports()
returns table (
  id uuid, report_number bigint, created_at timestamptz, target_type text, target_id uuid, target_title text,
  reason text, details text, status text, response_due_at timestamptz,
  response_at timestamptz, response_admitted boolean,
  decision_id uuid, outcome text, decision_summary text, violation_recorded boolean, decided_at timestamptz,
  appeal_deadline timestamptz, decision_accepted_at timestamptz,
  appeal_id uuid, appeal_status text, appeal_submitted_at timestamptz, appeal_decided_at timestamptz, appeal_note text
)
language sql stable security definer set search_path = '' as $$
  select r.id, r.report_number, r.created_at, r.target_type, r.target_id,
         case r.target_type
           when 'course' then (select c.title from public.courses c where c.id = r.target_id)
           when 'program' then (select p.title from public.programs p where p.id = r.target_id)
           when 'trainer' then 'ملفك المهني'
         end,
         r.reason, r.details, r.status, r.created_at + interval '48 hours',
         rr.created_at, rr.admitted,
         d.id, d.outcome, d.summary, d.violation_recorded, d.decided_at, d.appeal_deadline, d.accepted_at,
         a.id, a.status, a.submitted_at, a.decided_at, a.decision_note
  from public.violation_reports r
  left join public.report_responses rr on rr.report_id = r.id
  left join public.report_decisions d on d.report_id = r.id
  left join public.report_appeals a on a.decision_id = d.id
  where r.status <> 'withdrawn'
    and public.report_target_trainer(r.id) = auth.uid()
  order by r.created_at desc;
$$;

-- ── Trainer RPCs ─────────────────────────────────────────────────────────────
-- «أرسل ردّي» / «أقرّ بالخطأ وأصحّح الوصف». One response per report, while it is open and undecided.
create or replace function public.respond_to_report(p_report uuid, p_body text, p_admit boolean, p_attachments jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare u uuid := public.require_user(); r public.violation_reports; body text := trim(coalesce(p_body, ''));
begin
  select * into r from public.violation_reports where id = p_report for update;
  if not found or public.report_target_trainer(r.id) is distinct from u then raise exception 'not_found' using errcode = 'P0001'; end if;
  if r.status not in ('open', 'reviewing') or exists (select 1 from public.report_decisions d where d.report_id = r.id) then
    raise exception 'report_closed' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.report_responses x where x.report_id = r.id) then raise exception 'already_responded' using errcode = 'P0001'; end if;
  if coalesce(p_admit, false) and body = '' then body := 'أقرّ بالخطأ وسأصحّح الوصف.'; end if;
  if char_length(body) < 20 and not coalesce(p_admit, false) then raise exception 'response_too_short' using errcode = 'P0001'; end if;
  if p_attachments is not null and (jsonb_typeof(p_attachments) <> 'array' or jsonb_array_length(p_attachments) > 5) then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;
  -- Attachments must be the caller's own uploads.
  if exists (select 1 from jsonb_array_elements(coalesce(p_attachments, '[]'::jsonb)) e
             where coalesce(e->>'path', '') not like u::text || '/%') then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;
  insert into public.report_responses (report_id, trainer_id, body, admitted, attachments)
  values (r.id, u, left(body, 4000), coalesce(p_admit, false), coalesce(p_attachments, '[]'::jsonb));
  update public.violation_reports set status = 'reviewing' where id = r.id;
  insert into public.notifications (user_id, kind, title, body, link)
  select w.user_id, 'report', 'ردّ مدرب على بلاغ', 'وصل ردّ المدرب على البلاغ RPT-' || r.report_number || '.', null
  from public.user_workspaces w where w.kind = 'admin';
end $$;

-- «أرسل التظلّم»: one appeal per decision, within the appeal window, only against upheld decisions.
create or replace function public.submit_report_appeal(p_report uuid, p_basis text, p_body text, p_attachments jsonb, p_ack boolean)
returns uuid language plpgsql security definer set search_path = '' as $$
declare u uuid := public.require_user(); d public.report_decisions; aid uuid; num bigint;
begin
  if public.report_target_trainer(p_report) is distinct from u then raise exception 'not_found' using errcode = 'P0001'; end if;
  select * into d from public.report_decisions where report_id = p_report for update;
  if not found then raise exception 'no_decision' using errcode = 'P0001'; end if;
  if d.outcome = 'dismissed' then raise exception 'nothing_to_appeal' using errcode = 'P0001'; end if;
  if d.accepted_at is not null then raise exception 'decision_accepted' using errcode = 'P0001'; end if;
  if exists (select 1 from public.report_appeals a where a.decision_id = d.id) then raise exception 'appeal_exists' using errcode = 'P0001'; end if;
  if now() > d.appeal_deadline then raise exception 'appeal_window_closed' using errcode = 'P0001'; end if;
  if not coalesce(p_ack, false) then raise exception 'ack_required' using errcode = 'P0001'; end if;
  if p_basis is null or p_basis not in ('new_evidence', 'fact_error', 'disproportionate') then raise exception 'basis_required' using errcode = 'P0001'; end if;
  if char_length(trim(coalesce(p_body, ''))) < 20 then raise exception 'appeal_too_short' using errcode = 'P0001'; end if;
  if p_attachments is not null and (jsonb_typeof(p_attachments) <> 'array' or jsonb_array_length(p_attachments) > 5) then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;
  if exists (select 1 from jsonb_array_elements(coalesce(p_attachments, '[]'::jsonb)) e
             where coalesce(e->>'path', '') not like u::text || '/%') then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;
  insert into public.report_appeals (decision_id, report_id, trainer_id, basis, body, attachments, acknowledged)
  values (d.id, p_report, u, p_basis, left(trim(p_body), 4000), coalesce(p_attachments, '[]'::jsonb), true)
  returning id into aid;
  select report_number into num from public.violation_reports where id = p_report;
  insert into public.notifications (user_id, kind, title, body, link)
  select w.user_id, 'report', 'تظلّم جديد على قرار بلاغ', 'قدّم المدرب تظلّمًا على قرار البلاغ RPT-' || num || '.', null
  from public.user_workspaces w where w.kind = 'admin' and w.user_id is distinct from d.decided_by;
  return aid;
end $$;

-- «أقبل القرار وأعدّل الوصف»
create or replace function public.accept_report_decision(p_report uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare u uuid := public.require_user(); d public.report_decisions;
begin
  if public.report_target_trainer(p_report) is distinct from u then raise exception 'not_found' using errcode = 'P0001'; end if;
  select * into d from public.report_decisions where report_id = p_report for update;
  if not found then raise exception 'no_decision' using errcode = 'P0001'; end if;
  if exists (select 1 from public.report_appeals a where a.decision_id = d.id) then raise exception 'appeal_exists' using errcode = 'P0001'; end if;
  if d.accepted_at is null then update public.report_decisions set accepted_at = now() where id = d.id; end if;
end $$;

-- ── Compliance (admin) RPCs ──────────────────────────────────────────────────
create or replace function public.admin_decide_report(p_report uuid, p_outcome text, p_summary text, p_violation boolean)
returns uuid language plpgsql security definer set search_path = '' as $$
declare u uuid := public.require_user(); r public.violation_reports; did uuid; owner uuid;
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = 'P0001'; end if;
  select * into r from public.violation_reports where id = p_report for update;
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
  if r.status in ('withdrawn') or exists (select 1 from public.report_decisions d where d.report_id = r.id) then
    raise exception 'report_closed' using errcode = 'P0001';
  end if;
  if p_outcome not in ('upheld', 'partially_upheld', 'dismissed') then raise exception 'invalid_input' using errcode = 'P0001'; end if;
  insert into public.report_decisions (report_id, outcome, summary, violation_recorded, decided_by, appeal_deadline)
  values (r.id, p_outcome, trim(p_summary), coalesce(p_violation, false) and p_outcome <> 'dismissed', u, now() + interval '7 days')
  returning id into did;
  update public.violation_reports set status = case when p_outcome = 'dismissed' then 'dismissed' else 'actioned' end where id = r.id;
  owner := public.report_target_trainer(r.id);
  if owner is not null then
    perform public.notify(owner, 'report',
      case when p_outcome = 'dismissed' then 'أُغلق البلاغ لصالحك' else 'صدر قرار في بلاغ على محتواك' end,
      case when p_outcome = 'dismissed' then 'البلاغ RPT-' || r.report_number || ' أُغلق — لا مخالفة.'
           else 'صدر قرار في البلاغ RPT-' || r.report_number || '. لك حق التظلّم خلال ٧ أيام.' end,
      case when p_outcome = 'dismissed' then '/trainer/reports' else '/trainer/reports/' || r.id || '/appeal' end);
  end if;
  return did;
end $$;

create or replace function public.admin_decide_appeal(p_appeal uuid, p_upheld boolean, p_note text)
returns void language plpgsql security definer set search_path = '' as $$
declare u uuid := public.require_user(); a public.report_appeals; d public.report_decisions; num bigint;
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = 'P0001'; end if;
  select * into a from public.report_appeals where id = p_appeal for update;
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
  if a.status <> 'pending' then raise exception 'appeal_decided' using errcode = 'P0001'; end if;
  select * into d from public.report_decisions where id = a.decision_id;
  -- «يراجع طلبك مسؤول لم يشارك في القرار الأول»
  if d.decided_by = u then raise exception 'same_reviewer' using errcode = 'P0001'; end if;
  update public.report_appeals set status = case when p_upheld then 'upheld' else 'rejected' end, decided_by = u, decided_at = now(),
         decision_note = nullif(trim(coalesce(p_note, '')), '')
  where id = a.id;
  if p_upheld then
    update public.report_decisions set violation_recorded = false where id = d.id;
  end if;
  select report_number into num from public.violation_reports where id = a.report_id;
  perform public.notify(a.trainer_id, 'report', case when p_upheld then 'قُبل تظلّمك' else 'رُفض تظلّمك' end,
    case when p_upheld then 'قُبل تظلّمك على قرار البلاغ RPT-' || num || ' وأُلغيت المخالفة.'
         else 'رُفض تظلّمك على قرار البلاغ RPT-' || num || '. القرار نهائي.' end, '/trainer/reports');
end $$;

revoke execute on function
  public.report_target_trainer(uuid), public.owns_reported_content(uuid), public.my_content_reports(),
  public.respond_to_report(uuid, text, boolean, jsonb), public.submit_report_appeal(uuid, text, text, jsonb, boolean),
  public.accept_report_decision(uuid), public.admin_decide_report(uuid, text, text, boolean), public.admin_decide_appeal(uuid, boolean, text)
from public, anon, authenticated;
grant execute on function
  public.owns_reported_content(uuid), public.my_content_reports(),
  public.respond_to_report(uuid, text, boolean, jsonb), public.submit_report_appeal(uuid, text, text, jsonb, boolean),
  public.accept_report_decision(uuid), public.admin_decide_report(uuid, text, text, boolean), public.admin_decide_appeal(uuid, boolean, text)
to authenticated;
