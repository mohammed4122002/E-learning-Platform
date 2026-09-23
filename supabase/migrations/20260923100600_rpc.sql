-- Business operations as security-definer RPCs. Each one checks auth.uid() and the business rules itself.
-- Errors are raised as P0001 with a stable machine code in MESSAGE; the app maps codes to Arabic copy.

create table public.app_settings (
  key text primary key,
  value jsonb not null
);
alter table public.app_settings enable row level security;
-- Sandbox payments are OFF unless an admin explicitly enables them (never in production).
insert into public.app_settings (key, value) values ('payments_sandbox', 'false'::jsonb);

create or replace function public.require_user() returns uuid
language plpgsql stable set search_path = '' as $$
declare u uuid := auth.uid();
begin
  if u is null then raise exception 'not_authenticated' using errcode = 'P0001'; end if;
  return u;
end $$;

-- Internal RPCs mark the transaction as trusted so protect_profile_fields lets their writes through.
-- set_config lives in pg_catalog, which PostgREST does not expose, so clients cannot set this themselves.
create or replace function public.protect_profile_fields() returns trigger
language plpgsql set search_path = '' as $$
begin
  if auth.uid() is not null and not public.is_admin()
     and coalesce(current_setting('app.trusted_op', true), '') <> 'on' then
    new.identity_status := old.identity_status;
    new.frozen_at := old.frozen_at;
  end if;
  return new;
end $$;

create or replace function public.notify(u uuid, k text, t text, b text, l text) returns void
language sql security definer set search_path = '' as $$
  insert into public.notifications (user_id, kind, title, body, link) values (u, k, t, b, l);
$$;
revoke execute on function public.notify(uuid, text, text, text, text) from public, anon, authenticated;

-- ── Workspaces (PUB-CTX-01) ───────────────────────────────────────────────
create or replace function public.add_workspace(p_kind public.workspace_kind, p_org_name text default null, p_org_city text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  u uuid := public.require_user();
  org uuid;
  ws uuid;
  has_default boolean;
begin
  if p_kind = 'admin' then raise exception 'forbidden' using errcode = 'P0001'; end if;
  if p_kind in ('provider', 'studio', 'requester') then
    if p_org_name is null or char_length(trim(p_org_name)) < 2 then
      raise exception 'organization_name_required' using errcode = 'P0001';
    end if;
    insert into public.organizations (kind, name, slug, city, created_by)
    values (p_kind::text::public.organization_kind, trim(p_org_name),
            'org-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 10), p_org_city, u)
    returning id into org;
    insert into public.organization_members (organization_id, user_id, role) values (org, u, 'owner');
  end if;
  select exists (select 1 from public.user_workspaces w where w.user_id = u and w.is_default) into has_default;
  insert into public.user_workspaces (user_id, kind, organization_id, is_default)
  values (u, p_kind, org, not has_default)
  on conflict do nothing
  returning id into ws;
  if ws is null then
    select w.id into ws from public.user_workspaces w where w.user_id = u and w.kind = p_kind and w.organization_id is not distinct from org;
  end if;
  return ws;
end $$;

-- ── Catalog helpers ───────────────────────────────────────────────────────
-- Public syllabus (no media paths).
create or replace function public.course_outline(p_course uuid)
returns table (module_id uuid, module_position int, module_title text, lesson_id uuid, lesson_position int,
               lesson_title text, kind public.lesson_kind, duration_seconds int, is_preview boolean)
language sql stable security definer set search_path = '' as $$
  select m.id, m.position, m.title, l.id, l.position, l.title, l.kind, l.duration_seconds, l.is_preview
  from public.course_modules m
  join public.courses c on c.id = m.course_id and (c.status <> 'draft' or public.manages_course(c.id))
  left join public.lessons l on l.module_id = m.id and l.published_at is not null
  where m.course_id = p_course
  order by m.position, l.position;
$$;

create or replace function public.course_seats_left(p_course uuid) returns int
language sql stable security definer set search_path = '' as $$
  select case when c.capacity is null then null else greatest(c.capacity - public.course_seats_taken(c.id), 0) end
  from public.courses c where c.id = p_course;
$$;

-- ── Enrollment (TRN-ENR-01..05, BR-L7, BR-L3) ─────────────────────────────
create or replace function public.quote_enrollment(p_course uuid, p_code text default null)
returns table (list_price numeric, discount numeric, total numeric, currency text, code_status text)
language plpgsql stable security definer set search_path = '' as $$
declare
  c public.courses;
  d public.discount_codes;
  disc numeric := 0;
  st text := 'none';
begin
  select * into c from public.courses where id = p_course and status in ('open', 'in_progress');
  if not found then raise exception 'course_unavailable' using errcode = 'P0001'; end if;
  if p_code is not null and trim(p_code) <> '' then
    select * into d from public.discount_codes x
    where x.code = upper(trim(p_code)) and x.active
      and (x.course_id is null or x.course_id = p_course)
      and (x.valid_until is null or x.valid_until > now())
      and (x.max_uses is null or x.used_count < x.max_uses);
    if found then
      disc := least(c.price, coalesce(round(c.price * d.percent_off / 100, 2), d.amount_off));
      st := 'applied';
    else
      st := 'invalid';
    end if;
  end if;
  return query select c.price, disc, c.price - disc, c.currency, st;
end $$;

create or replace function public.start_enrollment(p_course uuid, p_code text default null, p_funding text default 'self')
returns table (enrollment_id uuid, status public.enrollment_status, hold_expires_at timestamptz, total numeric)
language plpgsql security definer set search_path = '' as $$
declare
  u uuid := public.require_user();
  c public.courses;
  q record;
  e public.enrollments;
  code_id uuid;
begin
  -- Lock the course row so two buyers cannot take the last seat together (BR-L7).
  select * into c from public.courses where id = p_course for update;
  if not found or c.status not in ('open', 'in_progress') or (c.mode <> 'recorded' and c.status <> 'open') then
    raise exception 'course_unavailable' using errcode = 'P0001';
  end if;
  if p_funding not in ('self', 'employer', 'sponsored') then raise exception 'invalid_input' using errcode = 'P0001'; end if;

  -- Re-use an existing live enrollment instead of creating a duplicate.
  select * into e from public.enrollments x
  where x.course_id = p_course and x.trainee_id = u and x.status not in ('withdrawn', 'cancelled', 'access_revoked');
  if found then
    if e.status = 'pending_payment' and e.hold_expires_at > now() then
      return query select e.id, e.status, e.hold_expires_at, e.price_paid;
      return;
    elsif e.status = 'pending_payment' then
      update public.enrollments set status = 'cancelled', ended_at = now(), end_reason = 'hold_expired' where id = e.id;
    else
      raise exception 'already_enrolled' using errcode = 'P0001';
    end if;
  end if;

  if c.capacity is not null and public.course_seats_taken(c.id) >= c.capacity then
    raise exception 'course_full' using errcode = 'P0001';
  end if;

  select * into q from public.quote_enrollment(p_course, p_code);
  if q.code_status = 'invalid' then raise exception 'invalid_discount_code' using errcode = 'P0001'; end if;
  if q.code_status = 'applied' then
    select id into code_id from public.discount_codes where code = upper(trim(p_code));
  end if;

  if q.total = 0 then
    insert into public.enrollments (course_id, trainee_id, status, list_price, price_paid, currency, discount_code_id, funding, confirmed_at)
    values (p_course, u, case when c.requires_provider_approval then 'pending_provider' else 'confirmed' end,
            q.list_price, 0, q.currency, code_id, p_funding,
            case when c.requires_provider_approval then null else now() end)
    returning * into e;
    if e.status = 'confirmed' then
      update public.courses set learners_count = learners_count + 1 where id = p_course;
      perform public.notify(u, 'enrollment_confirmed', 'تم تأكيد تسجيلك', c.title, '/trainee/trainings/' || e.id);
    end if;
    if code_id is not null then update public.discount_codes set used_count = used_count + 1 where id = code_id; end if;
  else
    insert into public.enrollments (course_id, trainee_id, status, list_price, price_paid, currency, discount_code_id, funding, hold_expires_at)
    values (p_course, u, 'pending_payment', q.list_price, q.total, q.currency, code_id, p_funding, now() + interval '15 minutes')
    returning * into e;
  end if;
  return query select e.id, e.status, e.hold_expires_at, e.price_paid;
end $$;

create or replace function public.create_payment(p_enrollment uuid, p_method text, p_idempotency_key text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  u uuid := public.require_user();
  e public.enrollments;
  pid uuid;
begin
  if p_method not in ('card', 'mada', 'apple_pay') then raise exception 'invalid_input' using errcode = 'P0001'; end if;
  if char_length(coalesce(p_idempotency_key, '')) < 16 then raise exception 'invalid_input' using errcode = 'P0001'; end if;
  select id into pid from public.payments where idempotency_key = p_idempotency_key and trainee_id = u;
  if found then return pid; end if;
  select * into e from public.enrollments where id = p_enrollment and trainee_id = u for update;
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
  if e.status <> 'pending_payment' then raise exception 'invalid_state' using errcode = 'P0001'; end if;
  if e.hold_expires_at <= now() then raise exception 'hold_expired' using errcode = 'P0001'; end if;
  -- BR-L12: never two concurrent attempts for one enrollment.
  if exists (select 1 from public.payments p where p.enrollment_id = e.id and p.status in ('pending', 'processing')) then
    raise exception 'payment_in_progress' using errcode = 'P0001';
  end if;
  insert into public.payments (enrollment_id, trainee_id, amount, currency, method, provider, status, idempotency_key)
  values (e.id, u, e.price_paid, e.currency, p_method, 'pending', 'processing', p_idempotency_key)
  returning id into pid;
  return pid;
end $$;

-- Called only by the trusted server (payment webhook / sandbox) — not exposed to clients.
create or replace function public.settle_payment(p_payment uuid, p_provider text, p_provider_ref text, p_succeeded boolean, p_failure text default null)
returns public.payment_status language plpgsql security definer set search_path = '' as $$
declare
  p public.payments;
  e public.enrollments;
  c public.courses;
begin
  select * into p from public.payments where id = p_payment for update;
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
  if p.status in ('succeeded', 'failed', 'expired', 'refunded') then return p.status; end if;
  select * into e from public.enrollments where id = p.enrollment_id for update;
  select * into c from public.courses where id = e.course_id;
  if p_succeeded then
    update public.payments set status = 'succeeded', provider = p_provider, provider_ref = p_provider_ref where id = p.id;
    insert into public.receipts (payment_id, amount, vat_amount, currency)
    values (p.id, p.amount, round(p.amount * 15 / 115, 2), p.currency);
    update public.enrollments set
      status = case when c.requires_provider_approval then 'pending_provider'::public.enrollment_status else 'confirmed' end,
      confirmed_at = case when c.requires_provider_approval then null else now() end,
      hold_expires_at = null
    where id = e.id;
    update public.courses set price_locked_at = coalesce(price_locked_at, now()),
      learners_count = learners_count + 1 where id = c.id;
    if e.discount_code_id is not null then
      update public.discount_codes set used_count = used_count + 1 where id = e.discount_code_id;
    end if;
    perform public.notify(e.trainee_id, 'payment_succeeded', 'تمت عملية الدفع بنجاح', c.title, '/trainee/trainings/' || e.id);
    return 'succeeded';
  else
    update public.payments set status = 'failed', provider = p_provider, provider_ref = p_provider_ref,
      failure_reason = left(coalesce(p_failure, 'declined'), 200) where id = p.id;
    return 'failed';
  end if;
end $$;
revoke execute on function public.settle_payment(uuid, text, text, boolean, text) from public, anon, authenticated;

-- Sandbox gateway for development only; refuses unless app_settings.payments_sandbox = true.
create or replace function public.sandbox_settle_payment(p_payment uuid, p_succeeded boolean)
returns public.payment_status language plpgsql security definer set search_path = '' as $$
declare u uuid := public.require_user();
begin
  if coalesce((select value from public.app_settings where key = 'payments_sandbox'), 'false'::jsonb) <> 'true'::jsonb then
    raise exception 'payments_unavailable' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.payments where id = p_payment and trainee_id = u) then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  return public.settle_payment(p_payment, 'sandbox', 'sbx_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 16),
                               p_succeeded, case when p_succeeded then null else 'card_declined' end);
end $$;

-- Offer the freed seat to the first person on the waitlist (TRN-WTL-02, 24h to accept).
create or replace function public.invite_next_waitlisted(p_course uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare w public.waitlist_entries; c public.courses;
begin
  select * into c from public.courses where id = p_course;
  if c.capacity is null or public.course_seats_taken(p_course) >= c.capacity then return; end if;
  select * into w from public.waitlist_entries
  where course_id = p_course and status = 'waiting' order by created_at limit 1 for update skip locked;
  if not found then return; end if;
  update public.waitlist_entries set status = 'invited', invited_at = now(), invite_expires_at = now() + interval '24 hours'
  where id = w.id;
  perform public.notify(w.trainee_id, 'waitlist_invite', 'توفّر مقعد في دورة تنتظرها', c.title, '/trainee/waitlist/' || w.id);
end $$;
revoke execute on function public.invite_next_waitlisted(uuid) from public, anon, authenticated;

create or replace function public.withdraw_enrollment(p_enrollment uuid, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare u uuid := public.require_user(); e public.enrollments;
begin
  select * into e from public.enrollments where id = p_enrollment and trainee_id = u for update;
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
  if e.status not in ('pending_payment', 'pending_provider', 'confirmed', 'in_progress') then
    raise exception 'invalid_state' using errcode = 'P0001';
  end if;
  update public.enrollments set status = 'withdrawn', ended_at = now(), end_reason = left(coalesce(p_reason, 'other'), 200)
  where id = e.id;
  if e.status in ('confirmed', 'in_progress') then
    update public.courses set learners_count = greatest(learners_count - 1, 0) where id = e.course_id;
  end if;
  perform public.invite_next_waitlisted(e.course_id);
end $$;

-- ── Waitlist (TRN-WTL-01/02) ──────────────────────────────────────────────
create or replace function public.join_waitlist(p_course uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare u uuid := public.require_user(); c public.courses; wid uuid;
begin
  select * into c from public.courses where id = p_course and status = 'open';
  if not found then raise exception 'course_unavailable' using errcode = 'P0001'; end if;
  if c.capacity is null or public.course_seats_taken(p_course) < c.capacity then
    raise exception 'seats_available' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.enrollments e where e.course_id = p_course and e.trainee_id = u
             and e.status not in ('withdrawn', 'cancelled', 'access_revoked')) then
    raise exception 'already_enrolled' using errcode = 'P0001';
  end if;
  insert into public.waitlist_entries (course_id, trainee_id) values (p_course, u)
  on conflict do nothing returning id into wid;
  if wid is null then raise exception 'already_waitlisted' using errcode = 'P0001'; end if;
  return wid;
end $$;

create or replace function public.leave_waitlist(p_entry uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare u uuid := public.require_user(); w public.waitlist_entries;
begin
  select * into w from public.waitlist_entries where id = p_entry and trainee_id = u and status in ('waiting', 'invited') for update;
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
  update public.waitlist_entries set status = 'left' where id = w.id;
  if w.status = 'invited' then perform public.invite_next_waitlisted(w.course_id); end if;
end $$;

-- Accepting an invite reserves the seat like a normal enrollment start.
create or replace function public.accept_waitlist_invite(p_entry uuid)
returns table (enrollment_id uuid, status public.enrollment_status, hold_expires_at timestamptz, total numeric)
language plpgsql security definer set search_path = '' as $$
declare u uuid := public.require_user(); w public.waitlist_entries;
begin
  select * into w from public.waitlist_entries where id = p_entry and trainee_id = u for update;
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
  if w.status <> 'invited' then raise exception 'invalid_state' using errcode = 'P0001'; end if;
  if w.invite_expires_at <= now() then
    update public.waitlist_entries set status = 'expired' where id = w.id;
    perform public.invite_next_waitlisted(w.course_id);
    raise exception 'invite_expired' using errcode = 'P0001';
  end if;
  update public.waitlist_entries set status = 'accepted' where id = w.id;
  -- The invited seat is free by construction; start_enrollment re-checks capacity under lock.
  return query select * from public.start_enrollment(w.course_id, null, 'self');
end $$;

-- ── Refunds & disputes (TRN-RFD, TRN-DSP, BR-L9) ─────────────────────────
create or replace function public.request_refund(p_enrollment uuid, p_reason text, p_details text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare u uuid := public.require_user(); e public.enrollments; rid uuid; cert boolean;
begin
  select * into e from public.enrollments where id = p_enrollment and trainee_id = u for update;
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
  if e.price_paid <= 0 or not exists (select 1 from public.payments p where p.enrollment_id = e.id and p.status = 'succeeded') then
    raise exception 'nothing_to_refund' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.refund_requests r where r.enrollment_id = e.id and r.status = 'under_review') then
    raise exception 'refund_already_requested' using errcode = 'P0001';
  end if;
  select exists (select 1 from public.certificates x where x.enrollment_id = e.id and x.status = 'issued') into cert;
  insert into public.refund_requests (enrollment_id, trainee_id, reason, details, amount, requires_admin)
  values (e.id, u, p_reason, nullif(trim(p_details), ''), e.price_paid, cert)
  returning id into rid;
  return rid;
end $$;

create or replace function public.open_dispute(p_payment uuid, p_reason text, p_details text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare u uuid := public.require_user(); did uuid;
begin
  if not exists (select 1 from public.payments p where p.id = p_payment and p.trainee_id = u and p.status in ('succeeded', 'refunded')) then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.disputes d where d.payment_id = p_payment and d.status in ('open', 'under_review')) then
    raise exception 'dispute_already_open' using errcode = 'P0001';
  end if;
  insert into public.disputes (payment_id, trainee_id, reason, details) values (p_payment, u, p_reason, trim(p_details))
  returning id into did;
  return did;
end $$;

create or replace function public.add_dispute_attachment(p_dispute uuid, p_path text, p_name text, p_size int)
returns uuid language plpgsql security definer set search_path = '' as $$
declare u uuid := public.require_user(); aid uuid;
begin
  if not exists (select 1 from public.disputes d where d.id = p_dispute and d.trainee_id = u and d.status in ('open', 'under_review')) then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  -- Files live under dispute-attachments/<uid>/..., enforced by storage policies.
  if split_part(p_path, '/', 1) <> u::text then raise exception 'forbidden' using errcode = 'P0001'; end if;
  if (select count(*) from public.dispute_attachments a where a.dispute_id = p_dispute) >= 5 then
    raise exception 'too_many_files' using errcode = 'P0001';
  end if;
  insert into public.dispute_attachments (dispute_id, file_path, file_name, size_bytes)
  values (p_dispute, p_path, left(p_name, 200), p_size) returning id into aid;
  return aid;
end $$;

-- ── Learning (BR-L10, BR-L11) ─────────────────────────────────────────────
create or replace function public.course_progress(p_course uuid, p_trainee uuid default null)
returns table (completed int, total int, percent int)
language sql stable security definer set search_path = '' as $$
  with t as (select count(*)::int n from public.lessons l where l.course_id = p_course and l.published_at is not null),
       d as (select count(*)::int n from public.lesson_progress p join public.lessons l on l.id = p.lesson_id
             where p.course_id = p_course and p.trainee_id = coalesce(p_trainee, auth.uid())
               and p.completed_at is not null and l.published_at is not null)
  select d.n, t.n, case when t.n = 0 then 0 else (d.n * 100 / t.n) end from t, d
  where coalesce(p_trainee, auth.uid()) = auth.uid() or public.manages_course(p_course);
$$;

create or replace function public.issue_certificate(p_enrollment uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare e public.enrollments; c public.courses; cid uuid; nm text;
begin
  select * into e from public.enrollments where id = p_enrollment;
  select * into c from public.courses where id = e.course_id;
  select full_name into nm from public.profiles where id = e.trainee_id;
  insert into public.certificates (enrollment_id, trainee_id, course_id, issuer_organization_id, trainer_id, trainee_name, course_title, hours)
  values (e.id, e.trainee_id, c.id, c.organization_id, c.trainer_id, coalesce(nullif(nm, ''), 'متدرب'), c.title, c.duration_hours)
  on conflict (enrollment_id) do nothing
  returning id into cid;
  if cid is not null then
    perform public.notify(e.trainee_id, 'certificate_issued', 'صدرت شهادتك', c.title, '/trainee/certificates/' || cid);
  end if;
  return cid;
end $$;
revoke execute on function public.issue_certificate(uuid) from public, anon, authenticated;

-- BR-L11: watching is progress. ≥ 90% watched (or opened, for non-video) marks the lesson complete.
create or replace function public.record_lesson_progress(p_lesson uuid, p_position int)
returns table (completed boolean, course_percent int)
language plpgsql security definer set search_path = '' as $$
declare
  u uuid := public.require_user();
  l public.lessons;
  e public.enrollments;
  done boolean;
  pr record;
begin
  select * into l from public.lessons where id = p_lesson and published_at is not null;
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
  select * into e from public.enrollments x where x.course_id = l.course_id and x.trainee_id = u
    and x.status in ('confirmed', 'in_progress', 'completed') for update;
  if not found then raise exception 'not_enrolled' using errcode = 'P0001'; end if;
  done := l.kind <> 'video' or l.duration_seconds = 0 or greatest(p_position, 0) >= l.duration_seconds * 0.9;
  insert into public.lesson_progress as lp (trainee_id, lesson_id, course_id, position_seconds, completed_at)
  values (u, l.id, l.course_id, least(greatest(p_position, 0), greatest(l.duration_seconds, 0)), case when done then now() end)
  on conflict (trainee_id, lesson_id) do update set
    position_seconds = excluded.position_seconds,
    completed_at = coalesce(lp.completed_at, excluded.completed_at),
    updated_at = now();
  select * into pr from public.course_progress(l.course_id, u);
  if e.status = 'confirmed' then
    update public.enrollments set status = 'in_progress' where id = e.id;
  end if;
  -- Completing a recorded course issues its certificate (BR-L10 keeps issued certificates untouched).
  if pr.total > 0 and pr.completed = pr.total and e.status <> 'completed' then
    update public.enrollments set status = 'completed', completed_at = now() where id = e.id;
    if (select mode from public.courses where id = l.course_id) = 'recorded' then
      perform public.issue_certificate(e.id);
    end if;
  end if;
  return query select coalesce((select lp2.completed_at is not null from public.lesson_progress lp2
                                where lp2.trainee_id = u and lp2.lesson_id = l.id), false), pr.percent;
end $$;

-- Quiz without the answer key.
create or replace function public.get_quiz(p_quiz uuid)
returns table (id uuid, course_id uuid, title text, pass_percent int, time_limit_minutes int, questions jsonb)
language plpgsql stable security definer set search_path = '' as $$
declare q public.quizzes;
begin
  select * into q from public.quizzes x where x.id = p_quiz;
  if not found or not (public.is_enrolled(q.course_id) or public.manages_course(q.course_id)) then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  return query select q.id, q.course_id, q.title, q.pass_percent, q.time_limit_minutes,
    coalesce((select jsonb_agg(jsonb_build_object('id', x ->> 'id', 'text', x ->> 'text', 'options', x -> 'options'))
              from jsonb_array_elements(q.questions) x), '[]'::jsonb);
end $$;

create or replace function public.submit_quiz(p_quiz uuid, p_answers jsonb)
returns table (attempt_id uuid, score_percent int, passed boolean, correct int, total int)
language plpgsql security definer set search_path = '' as $$
declare u uuid := public.require_user(); q public.quizzes; n int; ok int; sc int; aid uuid;
begin
  select * into q from public.quizzes where id = p_quiz;
  if not found or not public.is_enrolled(q.course_id) then raise exception 'not_found' using errcode = 'P0001'; end if;
  if jsonb_typeof(p_answers) <> 'object' then raise exception 'invalid_input' using errcode = 'P0001'; end if;
  select count(*), count(*) filter (where (p_answers ->> (x ->> 'id')) = (x ->> 'answer'))
    into n, ok from jsonb_array_elements(q.questions) x;
  sc := case when n = 0 then 0 else ok * 100 / n end;
  insert into public.quiz_attempts (quiz_id, trainee_id, answers, score_percent, passed, submitted_at)
  values (q.id, u, p_answers, sc, sc >= q.pass_percent, now()) returning id into aid;
  return query select aid, sc, sc >= q.pass_percent, ok, n;
end $$;

create or replace function public.submit_assignment(p_assignment uuid, p_file_path text, p_note text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare u uuid := public.require_user(); a public.assignments; sid uuid;
begin
  select * into a from public.assignments where id = p_assignment;
  if not found or not public.is_enrolled(a.course_id) then raise exception 'not_found' using errcode = 'P0001'; end if;
  if a.due_at is not null and a.due_at < now() then raise exception 'deadline_passed' using errcode = 'P0001'; end if;
  if p_file_path is not null and split_part(p_file_path, '/', 1) <> u::text then raise exception 'forbidden' using errcode = 'P0001'; end if;
  if p_file_path is null and coalesce(trim(p_note), '') = '' then raise exception 'invalid_input' using errcode = 'P0001'; end if;
  insert into public.assignment_submissions (assignment_id, trainee_id, file_path, note)
  values (a.id, u, p_file_path, nullif(trim(p_note), '')) returning id into sid;
  return sid;
end $$;

-- QR attendance (TRN-MYE-02 · تسجيل الحضور).
create or replace function public.check_in(p_code text)
returns table (session_id uuid, checked_in_at timestamptz, already boolean)
language plpgsql security definer set search_path = '' as $$
declare u uuid := public.require_user(); ac public.attendance_codes; s public.course_sessions; prev timestamptz;
begin
  select * into ac from public.attendance_codes where code = upper(trim(p_code));
  if not found then raise exception 'invalid_code' using errcode = 'P0001'; end if;
  if ac.expires_at < now() then raise exception 'code_expired' using errcode = 'P0001'; end if;
  select * into s from public.course_sessions where id = ac.session_id;
  if not public.is_enrolled(s.course_id) then raise exception 'not_enrolled' using errcode = 'P0001'; end if;
  select a.checked_in_at into prev from public.attendance a where a.session_id = s.id and a.trainee_id = u;
  if found then return query select s.id, prev, true; return; end if;
  insert into public.attendance (session_id, trainee_id, method) values (s.id, u, 'qr');
  update public.enrollments set status = 'in_progress' where course_id = s.course_id and trainee_id = u and status = 'confirmed';
  return query select s.id, now(), false;
end $$;

-- ── Ratings (BR-R3) ───────────────────────────────────────────────────────
create or replace function public.rate_course(p_enrollment uuid, p_content int, p_trainer int, p_org int, p_comment text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare u uuid := public.require_user(); e public.enrollments; c public.courses; rid uuid;
begin
  select * into e from public.enrollments where id = p_enrollment and trainee_id = u;
  if not found or e.status not in ('in_progress', 'completed') then raise exception 'not_eligible' using errcode = 'P0001'; end if;
  select * into c from public.courses where id = e.course_id;
  if c.organization_id is not null and p_org is null then raise exception 'invalid_input' using errcode = 'P0001'; end if;
  insert into public.course_ratings (course_id, enrollment_id, trainee_id, content_score, trainer_score, organization_score, comment)
  values (c.id, e.id, u, p_content, p_trainer, case when c.organization_id is null then null else p_org end, nullif(trim(p_comment), ''))
  on conflict (enrollment_id) do update set content_score = excluded.content_score, trainer_score = excluded.trainer_score,
    organization_score = excluded.organization_score, comment = excluded.comment
  returning id into rid;
  return rid;
end $$;

-- ── Public certificate verification (PUB-VRF-01/02) ───────────────────────
create or replace function public.verify_certificate(p_code text)
returns table (code text, status public.certificate_status, trainee_name text, course_title text, hours numeric,
               issued_at timestamptz, revoked_at timestamptz, issuer_name text, trainer_name text)
language sql stable security definer set search_path = '' as $$
  select x.code, x.status, x.trainee_name, x.course_title, x.hours, x.issued_at, x.revoked_at,
         o.name, t.full_name
  from public.certificates x
  left join public.organizations o on o.id = x.issuer_organization_id
  join public.profiles t on t.id = x.trainer_id
  where x.code = upper(trim(p_code)) and upper(trim(p_code)) ~ '^[0-9A-F]{12}$';
$$;
grant execute on function public.verify_certificate(text) to anon;

-- ── Messaging (GEN-MSG, BR-R1) ────────────────────────────────────────────
create or replace function public.start_conversation(p_course uuid, p_subject text, p_body text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare u uuid := public.require_user(); c public.courses; cid uuid;
begin
  select * into c from public.courses where id = p_course and status <> 'draft';
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
  if char_length(trim(coalesce(p_body, ''))) = 0 then raise exception 'invalid_input' using errcode = 'P0001'; end if;
  insert into public.conversations (subject, course_id) values (left(coalesce(nullif(trim(p_subject), ''), c.title), 200), c.id)
  returning id into cid;
  insert into public.conversation_participants (conversation_id, user_id, last_read_at) values (cid, u, now());
  -- BR-R1: provider courses route messages to the provider's team, independent courses to the trainer.
  if c.organization_id is not null then
    insert into public.conversation_participants (conversation_id, user_id)
    select cid, m.user_id from public.organization_members m where m.organization_id = c.organization_id and m.user_id <> u
    on conflict do nothing;
  elsif c.trainer_id <> u then
    insert into public.conversation_participants (conversation_id, user_id) values (cid, c.trainer_id);
  end if;
  insert into public.messages (conversation_id, sender_id, body) values (cid, u, trim(p_body));
  return cid;
end $$;

-- ── Identity verification (TRN-VER-01/02) ─────────────────────────────────
create or replace function public.submit_identity_verification(p_type text, p_last4 text, p_document_path text, p_selfie_path text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare u uuid := public.require_user(); vid uuid;
begin
  if exists (select 1 from public.identity_verifications v where v.user_id = u and v.status in ('pending', 'verified')) then
    raise exception 'verification_exists' using errcode = 'P0001';
  end if;
  if split_part(p_document_path, '/', 1) <> u::text or (p_selfie_path is not null and split_part(p_selfie_path, '/', 1) <> u::text) then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  insert into public.identity_verifications (user_id, document_type, document_number_last4, document_path, selfie_path)
  values (u, p_type, upper(p_last4), p_document_path, p_selfie_path) returning id into vid;
  perform set_config('app.trusted_op', 'on', true);
  update public.profiles set identity_status = 'pending' where id = u;
  return vid;
end $$;

-- ── Account deletion guard (BR-S3) ────────────────────────────────────────
create or replace function public.account_deletion_blockers()
returns table (reason text) language sql stable security definer set search_path = '' as $$
  select 'active_enrollment' where exists (select 1 from public.enrollments e where e.trainee_id = auth.uid()
    and e.status in ('pending_payment', 'pending_provider', 'confirmed', 'in_progress'))
  union all
  select 'open_refund' where exists (select 1 from public.refund_requests r where r.trainee_id = auth.uid() and r.status = 'under_review')
  union all
  select 'open_dispute' where exists (select 1 from public.disputes d where d.trainee_id = auth.uid() and d.status in ('open', 'under_review'));
$$;

create or replace function public.freeze_account() returns void
language plpgsql security definer set search_path = '' as $$
declare u uuid := public.require_user();
begin
  if exists (select 1 from public.account_deletion_blockers()) then
    raise exception 'account_has_commitments' using errcode = 'P0001';
  end if;
  perform set_config('app.trusted_op', 'on', true);
  update public.profiles set frozen_at = now(), is_public = false where id = u;
end $$;

-- ── Housekeeping: expire seat holds and waitlist invites (BR-L7) ─────────
create or replace function public.expire_stale_holds() returns int
language plpgsql security definer set search_path = '' as $$
declare n int; r record;
begin
  with x as (
    update public.enrollments set status = 'cancelled', ended_at = now(), end_reason = 'hold_expired'
    where status = 'pending_payment' and hold_expires_at <= now()
      and not exists (select 1 from public.payments p where p.enrollment_id = enrollments.id and p.status = 'processing')
    returning course_id
  ) select count(*) into n from x;
  for r in update public.waitlist_entries set status = 'expired'
           where status = 'invited' and invite_expires_at <= now() returning course_id loop
    perform public.invite_next_waitlisted(r.course_id);
  end loop;
  return n;
end $$;
revoke execute on function public.expire_stale_holds() from public, anon, authenticated;

-- Default privileges: RPCs are for signed-in users unless granted to anon above.
do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.prokind = 'f' loop
    execute format('revoke execute on function %s from anon', f.sig);
  end loop;
end $$;
grant execute on function public.verify_certificate(text) to anon;
grant execute on function public.course_outline(uuid) to anon;
grant execute on function public.course_seats_left(uuid) to anon;
grant execute on function public.quote_enrollment(uuid, text) to anon;
-- RLS helpers must stay callable by anon (policies evaluate them for anonymous catalog reads).
grant execute on function public.is_enrolled(uuid) to anon;
grant execute on function public.manages_course(uuid) to anon;
grant execute on function public.is_admin() to anon;
grant execute on function public.has_workspace(public.workspace_kind) to anon;
grant execute on function public.is_org_member(uuid) to anon;
grant execute on function public.course_seats_taken(uuid) to anon;
