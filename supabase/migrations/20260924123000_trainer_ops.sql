-- Trainer course operations (TRR-CRS-03/04/05, TRR-ATT-01/02/03, TRR-RES-01, TRR-CRS-11, TRR-CRT-01/02, TRR-RTG-01/02/03).
-- Additive only: new tables for the trainer's registers (attendance sheets & marks, result sheets, submission reviews,
-- rating replies & review requests, program certificates, an operations log) and security-definer RPCs that check
-- manages_course(). Existing trainee-side tables keep their meaning:
--   · attendance        = sessions a trainee attended (QR / online / approved manual marks)
--   · assignment_submissions.score/status = what the trainee sees (drafts stay in submission_reviews)
--   · certificates      = issued through the existing issue_certificate() (BR-R2 issuer = provider organization)

-- ── Operations log (seats, postpone, cancel, broadcasts, rating requests, attendance edits) ─────────
create table public.course_operations (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  kind text not null check (kind in ('capacity', 'postpone', 'cancel', 'broadcast', 'rating_request', 'attendance_edit', 'release_hold', 'grant_seat')),
  actor_id uuid references public.profiles (id) on delete set null,
  reason text check (char_length(reason) <= 60),
  message text check (char_length(message) <= 2000),
  details jsonb not null default '{}'::jsonb,
  affected int not null default 0,
  created_at timestamptz not null default now()
);
create index course_operations_course_idx on public.course_operations (course_id, kind, created_at desc);
create index course_operations_actor_idx on public.course_operations (actor_id);
alter table public.course_operations enable row level security;
create policy course_operations_staff on public.course_operations for select
  using (public.manages_course(course_id) or public.is_admin());

-- ── Attendance register (TRR-ATT-01/03) ───────────────────────────────────────────────────────────
create table public.attendance_sheets (
  session_id uuid primary key references public.course_sessions (id) on delete cascade,
  status text not null default 'draft' check (status in ('draft', 'approved')),
  source text not null default 'manual' check (source in ('manual', 'qr', 'import')),
  import_status text check (import_status in ('completed', 'failed')),
  import_provider text check (char_length(import_provider) <= 40),
  imported_at timestamptz,
  approved_at timestamptz,
  approved_by uuid references public.profiles (id) on delete set null,
  unlock_requested_at timestamptz,
  unlock_reason text check (char_length(unlock_reason) <= 1000),
  updated_at timestamptz not null default now()
);
create index attendance_sheets_approved_by_idx on public.attendance_sheets (approved_by);
alter table public.attendance_sheets enable row level security;
create policy attendance_sheets_staff on public.attendance_sheets for select
  using (exists (select 1 from public.course_sessions s where s.id = session_id and (public.manages_course(s.course_id) or public.is_admin())));

create table public.attendance_marks (
  session_id uuid not null references public.course_sessions (id) on delete cascade,
  trainee_id uuid not null references public.profiles (id) on delete cascade,
  status text not null check (status in ('present', 'late', 'excused', 'absent')),
  marked_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (session_id, trainee_id)
);
create index attendance_marks_trainee_idx on public.attendance_marks (trainee_id);
create index attendance_marks_marked_by_idx on public.attendance_marks (marked_by);
alter table public.attendance_marks enable row level security;
-- The trainee sees their own marks only once the sheet is approved («بعد الاعتماد يظهر الحضور للمتدرب»).
create policy attendance_marks_read on public.attendance_marks for select
  using (
    exists (select 1 from public.course_sessions s where s.id = session_id and (public.manages_course(s.course_id) or public.is_admin()))
    or (trainee_id = (select auth.uid())
        and exists (select 1 from public.attendance_sheets h where h.session_id = attendance_marks.session_id and h.status = 'approved'))
  );

create index if not exists attendance_codes_session_idx on public.attendance_codes (session_id, expires_at desc);
create index if not exists attendance_trainee_idx on public.attendance (trainee_id);

-- ── Results (TRR-RES-01) ─────────────────────────────────────────────────────────────────────────
create table public.course_results (
  enrollment_id uuid primary key references public.enrollments (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  trainee_id uuid not null references public.profiles (id) on delete cascade,
  attendance_percent int check (attendance_percent between 0 and 100),
  assignment_points numeric(7, 1),
  assignment_max numeric(7, 1),
  quiz_percent int check (quiz_percent between 0 and 100),
  final_percent int not null default 0 check (final_percent between 0 and 100),
  outcome text not null check (outcome in ('passed', 'failed', 'below_attendance')),
  overridden boolean not null default false,
  updated_at timestamptz not null default now()
);
create index course_results_course_idx on public.course_results (course_id);
create index course_results_trainee_idx on public.course_results (trainee_id);

create table public.course_result_approvals (
  course_id uuid primary key references public.courses (id) on delete cascade,
  approved_at timestamptz not null default now(),
  approved_by uuid references public.profiles (id) on delete set null,
  passed int not null default 0,
  failed int not null default 0
);
create index course_result_approvals_by_idx on public.course_result_approvals (approved_by);

alter table public.course_results enable row level security;
alter table public.course_result_approvals enable row level security;
create policy course_results_read on public.course_results for select
  using (public.manages_course(course_id) or public.is_admin()
         or (trainee_id = (select auth.uid()) and exists (select 1 from public.course_result_approvals a where a.course_id = course_results.course_id)));
create policy course_result_approvals_read on public.course_result_approvals for select
  using (public.manages_course(course_id) or public.is_admin() or public.is_enrolled(course_id));

-- ── Assignment grading drafts (TRR-CRS-11) ───────────────────────────────────────────────────────
create table public.submission_reviews (
  submission_id uuid primary key references public.assignment_submissions (id) on delete cascade,
  reviewer_id uuid references public.profiles (id) on delete set null,
  rubric_scores jsonb not null default '{}'::jsonb,
  score numeric(6, 1),
  feedback text check (char_length(feedback) <= 4000),
  flagged boolean not null default false,
  updated_at timestamptz not null default now()
);
create index submission_reviews_reviewer_idx on public.submission_reviews (reviewer_id);
alter table public.submission_reviews enable row level security;
create policy submission_reviews_staff on public.submission_reviews for select
  using (exists (select 1 from public.assignment_submissions s join public.assignments a on a.id = s.assignment_id
                 where s.id = submission_id and (public.manages_course(a.course_id) or public.is_admin())));

-- ── Rating replies & review requests (TRR-RTG-02/03) ─────────────────────────────────────────────
create table public.rating_replies (
  rating_id uuid primary key references public.course_ratings (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete restrict,
  body text check (char_length(body) <= 1500),
  status text not null check (status in ('draft', 'published', 'skipped')),
  published_at timestamptz,
  updated_at timestamptz not null default now(),
  check (status <> 'published' or char_length(body) >= 10)
);
create index rating_replies_author_idx on public.rating_replies (author_id);
alter table public.rating_replies enable row level security;
-- Published replies are public like the ratings themselves; drafts only for the course staff.
create policy rating_replies_read on public.rating_replies for select
  using (status = 'published'
         or exists (select 1 from public.course_ratings r where r.id = rating_id and (public.manages_course(r.course_id) or public.is_admin())));

create table public.rating_review_requests (
  id uuid primary key default gen_random_uuid(),
  rating_id uuid not null references public.course_ratings (id) on delete cascade,
  requester_id uuid not null references public.profiles (id) on delete restrict,
  reason text not null check (reason in ('abusive', 'not_attended', 'private_data', 'duplicate')),
  details text not null check (char_length(details) between 20 and 2000),
  evidence_path text check (char_length(evidence_path) <= 400),
  status text not null default 'under_review' check (status in ('under_review', 'kept', 'hidden')),
  decision_note text,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
create unique index rating_review_open_uniq on public.rating_review_requests (rating_id) where status = 'under_review';
create index rating_review_requester_idx on public.rating_review_requests (requester_id);
alter table public.rating_review_requests enable row level security;
create policy rating_review_requests_read on public.rating_review_requests for select
  using (requester_id = (select auth.uid()) or public.is_admin()
         or exists (select 1 from public.course_ratings r where r.id = rating_id and public.manages_course(r.course_id)));

-- ── Program certificates (TRR-CRT-02) ────────────────────────────────────────────────────────────
create table public.program_certificates (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)),
  program_id uuid not null references public.programs (id) on delete restrict,
  program_version_id uuid not null references public.program_versions (id) on delete restrict,
  trainee_id uuid not null references public.profiles (id) on delete restrict,
  issuer_organization_id uuid references public.organizations (id) on delete restrict,
  issued_by uuid references public.profiles (id) on delete set null,
  trainee_name text not null,
  program_title text not null,
  status public.certificate_status not null default 'issued',
  issued_at timestamptz not null default now(),
  unique (program_version_id, trainee_id)
);
create index program_certificates_program_idx on public.program_certificates (program_id);
create index program_certificates_trainee_idx on public.program_certificates (trainee_id);
create index program_certificates_issuer_idx on public.program_certificates (issuer_organization_id);
create index program_certificates_by_idx on public.program_certificates (issued_by);
alter table public.program_certificates enable row level security;
create policy program_certificates_read on public.program_certificates for select
  using (trainee_id = (select auth.uid()) or public.is_admin()
         or exists (select 1 from public.courses k where k.program_version_id = program_certificates.program_version_id and public.manages_course(k.id)));

-- ═════════════════════════════════════════════════════════════════════════════════════════════════
-- Helpers
-- ═════════════════════════════════════════════════════════════════════════════════════════════════

create or replace function public.require_course_manager(p_course uuid) returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare u uuid := public.require_user();
begin
  if not exists (select 1 from public.courses where id = p_course) then raise exception 'not_found' using errcode = 'P0001'; end if;
  if not public.manages_course(p_course) then raise exception 'forbidden' using errcode = 'P0001'; end if;
  return u;
end $$;

-- Names of the people around a course (enrollees, waitlist, raters) for its staff — profiles are private by default.
create or replace function public.course_people(p_course uuid)
returns table (person_id uuid, full_name text, avatar_path text)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_course_manager(p_course);
  return query
    select p.id, coalesce(nullif(p.full_name, ''), 'متدرب'), p.avatar_path
    from public.profiles p
    where p.id in (select e.trainee_id from public.enrollments e where e.course_id = p_course
                   union select w.trainee_id from public.waitlist_entries w where w.course_id = p_course
                   union select r.trainee_id from public.course_ratings r where r.course_id = p_course);
end $$;

-- «٨ من ٩ جلسات» on the roster: sessions attended per active trainee (approved marks + check-ins).
create or replace function public.session_is_locked(p_session uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select now() > s.ends_at + interval '48 hours' from public.course_sessions s where s.id = p_session), true);
$$;

-- Invites the next waiting trainees while seats (minus open invites) are free. 48h to pay (Figma 462:32510).
create or replace function public.trainer_invite_waitlisted(p_course uuid, p_limit int) returns int
language plpgsql security definer set search_path = '' as $$
declare c public.courses; w public.waitlist_entries; n int := 0; free int;
begin
  select * into c from public.courses where id = p_course;
  if c.capacity is null then return 0; end if;
  loop
    exit when n >= p_limit;
    free := c.capacity - public.course_seats_taken(p_course)
            - (select count(*)::int from public.waitlist_entries x where x.course_id = p_course and x.status = 'invited' and x.invite_expires_at > now());
    exit when free <= 0;
    select * into w from public.waitlist_entries
    where course_id = p_course and status = 'waiting' order by created_at limit 1 for update skip locked;
    exit when not found;
    update public.waitlist_entries set status = 'invited', invited_at = now(), invite_expires_at = now() + interval '48 hours'
    where id = w.id;
    perform public.notify(w.trainee_id, 'waitlist_invite', 'توفّر مقعد في دورة تنتظرها',
                          c.title || ' — لديك ٤٨ ساعة لإتمام الدفع.', '/trainee/waitlist/' || w.id);
    n := n + 1;
  end loop;
  return n;
end $$;

-- ═════════════════════════════════════════════════════════════════════════════════════════════════
-- Seats & waitlist (TRR-CRS-03 · 462:*)
-- ═════════════════════════════════════════════════════════════════════════════════════════════════

create or replace function public.update_course_capacity(p_course uuid, p_capacity int)
returns table (capacity int, promoted int)
language plpgsql security definer set search_path = '' as $$
declare u uuid := public.require_course_manager(p_course); c public.courses; taken int; n int; old int;
begin
  select * into c from public.courses where id = p_course for update;
  if c.mode = 'recorded' or c.status in ('cancelled', 'completed') then raise exception 'invalid_state' using errcode = 'P0001'; end if;
  if p_capacity is null or p_capacity < 1 or p_capacity > 1000 then raise exception 'invalid_input' using errcode = 'P0001'; end if;
  taken := public.course_seats_taken(p_course);
  if p_capacity < taken then raise exception 'capacity_below_enrolled' using errcode = 'P0001'; end if;
  old := c.capacity;
  update public.courses set capacity = p_capacity where id = p_course;
  n := case when p_capacity > coalesce(old, 0) then public.trainer_invite_waitlisted(p_course, p_capacity - coalesce(old, 0)) else 0 end;
  insert into public.course_operations (course_id, kind, actor_id, details, affected)
  values (p_course, 'capacity', u, jsonb_build_object('from', old, 'to', p_capacity), n);
  return query select p_capacity, n;
end $$;

-- «امنح مقعدًا للتالي»: the seat is granted by the trainer, not automatically (462:31905).
create or replace function public.grant_waitlist_seat(p_course uuid) returns int
language plpgsql security definer set search_path = '' as $$
declare u uuid := public.require_course_manager(p_course); c public.courses; n int;
begin
  select * into c from public.courses where id = p_course for update;
  if c.status not in ('open', 'in_progress') then raise exception 'invalid_state' using errcode = 'P0001'; end if;
  if not exists (select 1 from public.waitlist_entries w where w.course_id = p_course and w.status = 'waiting') then
    raise exception 'waitlist_empty' using errcode = 'P0001';
  end if;
  n := public.trainer_invite_waitlisted(p_course, 1);
  if n = 0 then raise exception 'no_free_seats' using errcode = 'P0001'; end if;
  insert into public.course_operations (course_id, kind, actor_id, affected) values (p_course, 'grant_seat', u, n);
  return n;
end $$;

-- «أخرج متدربًا لم يدفع»: releases an unpaid seat hold and opens it to the next person in the list.
create or replace function public.release_unpaid_hold(p_enrollment uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare u uuid; e public.enrollments; c public.courses;
begin
  select * into e from public.enrollments where id = p_enrollment for update;
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
  u := public.require_course_manager(e.course_id);
  if e.status <> 'pending_payment' then raise exception 'invalid_state' using errcode = 'P0001'; end if;
  if exists (select 1 from public.payments p where p.enrollment_id = e.id and p.status = 'processing') then
    raise exception 'payment_in_progress' using errcode = 'P0001';
  end if;
  select * into c from public.courses where id = e.course_id;
  update public.enrollments set status = 'cancelled', ended_at = now(), end_reason = 'released_by_trainer', hold_expires_at = null
  where id = e.id;
  update public.payments set status = 'expired' where enrollment_id = e.id and status = 'pending';
  perform public.notify(e.trainee_id, 'action_required', 'انتهى حجز مقعدك', c.title || ' — لم يكتمل الدفع فأُتيح المقعد لغيرك.', '/trainee/trainings');
  insert into public.course_operations (course_id, kind, actor_id, details, affected)
  values (e.course_id, 'release_hold', u, jsonb_build_object('enrollment', e.id), 1);
  perform public.trainer_invite_waitlisted(e.course_id, 1);
end $$;

-- ═════════════════════════════════════════════════════════════════════════════════════════════════
-- Postpone / cancel (TRR-CRS-04 · 277:5339 / 277:5650)
-- ═════════════════════════════════════════════════════════════════════════════════════════════════

create or replace function public.postpone_course(p_course uuid, p_starts_on date, p_ends_on date, p_reason text, p_message text)
returns int
language plpgsql security definer set search_path = '' as $$
declare
  u uuid := public.require_course_manager(p_course);
  c public.courses;
  first_start timestamptz;
  new_start timestamptz;
  new_end timestamptz;
  delta interval;
  last_end timestamptz;
  r record;
  n int := 0;
begin
  select * into c from public.courses where id = p_course for update;
  if c.mode = 'recorded' or c.status not in ('draft', 'open') then raise exception 'invalid_state' using errcode = 'P0001'; end if;
  if p_reason not in ('schedule_conflict', 'venue_not_ready', 'trainee_request', 'other') then raise exception 'invalid_input' using errcode = 'P0001'; end if;
  if char_length(coalesce(trim(p_message), '')) < 10 or char_length(p_message) > 2000 then raise exception 'invalid_input' using errcode = 'P0001'; end if;
  select min(s.starts_at) into first_start from public.course_sessions s where s.course_id = p_course and s.status <> 'cancelled';
  first_start := coalesce(first_start, c.starts_at);
  if first_start is null then raise exception 'invalid_state' using errcode = 'P0001'; end if;
  if first_start <= now() then raise exception 'course_already_started' using errcode = 'P0001'; end if;
  if p_starts_on is null or p_ends_on is null or p_ends_on < p_starts_on
     or p_starts_on <= (now() at time zone 'Asia/Riyadh')::date then
    raise exception 'invalid_dates' using errcode = 'P0001';
  end if;

  -- Keep the time of day; move every session by the same offset.
  new_start := (p_starts_on + (first_start at time zone 'Asia/Riyadh')::time) at time zone 'Asia/Riyadh';
  delta := new_start - first_start;
  if delta <= interval '0' then raise exception 'invalid_dates' using errcode = 'P0001'; end if;

  -- Shift in reverse order so (course_id, position) never collides and ends stay after starts.
  update public.course_sessions set starts_at = starts_at + delta, ends_at = ends_at + delta
  where course_id = p_course and status <> 'cancelled';
  select max(s.ends_at) into last_end from public.course_sessions s where s.course_id = p_course and s.status <> 'cancelled';
  new_end := (p_ends_on + coalesce((c.ends_at at time zone 'Asia/Riyadh')::time, time '23:00')) at time zone 'Asia/Riyadh';
  if last_end is not null and new_end < last_end then raise exception 'invalid_dates' using errcode = 'P0001'; end if;
  update public.courses set starts_at = coalesce(starts_at, first_start) + delta, ends_at = new_end where id = p_course;
  update public.attendance_codes set expires_at = now()
  where expires_at > now() and session_id in (select s.id from public.course_sessions s where s.course_id = p_course);

  for r in select e.id, e.trainee_id from public.enrollments e
           where e.course_id = p_course and e.status in ('pending_payment', 'pending_provider', 'confirmed', 'in_progress') loop
    perform public.notify(r.trainee_id, 'course_postponed', 'تأجّلت دورة «' || c.title || '»',
                          left(trim(p_message), 300) || ' — يمكنك الانسحاب باسترداد كامل خلال ٧ أيام.', '/trainee/trainings/' || r.id);
    n := n + 1;
  end loop;
  for r in select w.trainee_id from public.waitlist_entries w where w.course_id = p_course and w.status in ('waiting', 'invited') loop
    perform public.notify(r.trainee_id, 'course_postponed', 'تأجّلت دورة تنتظرها', c.title, '/trainee/waitlist');
  end loop;

  insert into public.course_operations (course_id, kind, actor_id, reason, message, details, affected)
  values (p_course, 'postpone', u, p_reason, trim(p_message),
          jsonb_build_object('from_start', first_start, 'to_start', new_start, 'to_end', new_end), n);
  return n;
end $$;

create or replace function public.cancel_course(p_course uuid, p_reason text, p_message text)
returns table (cancelled int, refunds int, refund_total numeric)
language plpgsql security definer set search_path = '' as $$
declare
  u uuid := public.require_course_manager(p_course);
  c public.courses;
  e record;
  n int := 0;
  nr int := 0;
  total numeric := 0;
  paid boolean;
  cert boolean;
  open_id uuid;
  active_count int := 0;
begin
  select * into c from public.courses where id = p_course for update;
  if c.status in ('cancelled', 'completed') then raise exception 'invalid_state' using errcode = 'P0001'; end if;
  if p_reason not in ('provider_request', 'venue_unavailable', 'trainer_emergency', 'low_enrollment', 'other') then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;
  if char_length(coalesce(trim(p_message), '')) < 10 or char_length(p_message) > 2000 then raise exception 'invalid_input' using errcode = 'P0001'; end if;

  for e in select * from public.enrollments x
           where x.course_id = p_course and x.status in ('pending_payment', 'pending_provider', 'confirmed', 'in_progress')
           for update loop
    if e.status in ('confirmed', 'in_progress') then active_count := active_count + 1; end if;
    update public.enrollments set status = 'cancelled', ended_at = now(), end_reason = 'course_cancelled', hold_expires_at = null
    where id = e.id;
    update public.payments set status = 'expired' where enrollment_id = e.id and status = 'pending';
    n := n + 1;

    -- Full automatic refund of what was paid (refund_quote tier «course_cancelled» = 100٪).
    paid := e.price_paid > 0 and exists (select 1 from public.payments p where p.enrollment_id = e.id and p.status = 'succeeded');
    if paid and not exists (select 1 from public.refund_requests r where r.enrollment_id = e.id and r.status = 'approved') then
      select exists (select 1 from public.certificates x where x.enrollment_id = e.id and x.status = 'issued') into cert;
      select r.id into open_id from public.refund_requests r where r.enrollment_id = e.id and r.status = 'under_review';
      if open_id is not null then
        update public.refund_requests set amount = e.price_paid, requires_admin = cert,
          status = case when cert then 'under_review'::public.request_status else 'approved' end,
          decided_at = case when cert then null else now() end,
          decision_note = case when cert then decision_note else 'course_cancelled' end
        where id = open_id;
      else
        insert into public.refund_requests (enrollment_id, trainee_id, reason, details, amount, requires_admin, status, decided_at, decision_note)
        values (e.id, e.trainee_id, 'other', 'course_cancelled', e.price_paid, cert,
                case when cert then 'under_review'::public.request_status else 'approved' end,
                case when cert then null else now() end,
                case when cert then null else 'course_cancelled' end);
      end if;
      nr := nr + 1;
      total := total + e.price_paid;
    end if;

    perform public.notify(e.trainee_id, 'course_cancelled', 'أُلغيت دورة «' || c.title || '»',
                          left(trim(p_message), 300) || case when paid then ' — يُسترد المبلغ المدفوع كاملًا.' else '' end,
                          '/trainee/trainings/' || e.id);
  end loop;

  for e in update public.waitlist_entries set status = 'expired'
           where course_id = p_course and status in ('waiting', 'invited') returning trainee_id loop
    perform public.notify(e.trainee_id, 'course_cancelled', 'أُلغيت دورة كنت تنتظرها', c.title, '/trainee/waitlist');
  end loop;

  update public.course_sessions set status = 'cancelled' where course_id = p_course and status in ('scheduled', 'live');
  update public.attendance_codes set expires_at = now()
  where expires_at > now() and session_id in (select s.id from public.course_sessions s where s.course_id = p_course);
  update public.courses set status = 'cancelled', learners_count = greatest(learners_count - active_count, 0) where id = p_course;

  insert into public.course_operations (course_id, kind, actor_id, reason, message, details, affected)
  values (p_course, 'cancel', u, p_reason, trim(p_message),
          jsonb_build_object('refunds', nr, 'refund_total', total, 'previous_status', c.status), n);
  return query select n, nr, total;
end $$;

-- A trainee who withdraws within 7 days of a postponement notice gets a full refund (277:5339 «ينسحب باسترداد كامل
-- ١٠٠٪ خلال ٧ أيام»). Same signature/body as 20260923110100 plus that tier.
create or replace function public.refund_quote(p_enrollment uuid)
returns table (percent int, amount numeric, tier text, paid numeric, currency text, reference_at timestamptz,
               starts_at timestamptz, days_before int, window_ends_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
declare
  u uuid := public.require_user();
  e public.enrollments;
  c public.courses;
  first_start timestamptz;
  ref timestamptz;
  d int;
  pct int := 0;
  t text;
  win timestamptz;
  postponed_at timestamptz;
begin
  select * into e from public.enrollments where id = p_enrollment and trainee_id = u;
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
  select * into c from public.courses where id = e.course_id;
  select min(s.starts_at) into first_start from public.course_sessions s where s.course_id = c.id and s.status <> 'cancelled';
  first_start := coalesce(first_start, c.starts_at);
  ref := case when e.status in ('withdrawn', 'cancelled', 'access_revoked') then coalesce(e.ended_at, now()) else now() end;
  select max(o.created_at) into postponed_at from public.course_operations o
  where o.course_id = c.id and o.kind = 'postpone' and o.created_at <= ref and o.created_at > e.created_at;

  if e.price_paid <= 0 or not exists (select 1 from public.payments p where p.enrollment_id = e.id and p.status = 'succeeded') then
    t := 'nothing_paid';
  elsif c.status = 'cancelled' or (e.status = 'cancelled' and coalesce(e.end_reason, '') <> 'hold_expired') then
    pct := 100; t := 'course_cancelled';
  elsif e.status = 'pending_provider' then
    pct := 100; t := 'pending_provider';
  elsif c.mode = 'recorded' then
    win := coalesce(e.confirmed_at, e.created_at) + interval '14 days';
    if ref <= win then pct := 100; t := 'recorded_window'; else t := 'recorded_expired'; end if;
  elsif postponed_at is not null and ref <= postponed_at + interval '7 days' then
    pct := 100; t := 'full'; win := postponed_at + interval '7 days';
  elsif first_start is null then
    pct := 100; t := 'full';
  else
    d := floor(extract(epoch from (first_start - ref)) / 86400)::int;
    if d >= 7 then pct := 100; t := 'full';
    elsif d >= 3 then pct := 50; t := 'half';
    else t := 'none';
    end if;
  end if;

  return query select pct, round(e.price_paid * pct / 100.0, 2), t, e.price_paid, e.currency, ref, first_start, d, win;
end $$;

-- ═════════════════════════════════════════════════════════════════════════════════════════════════
-- Attendance (TRR-ATT-01/02/03)
-- ═════════════════════════════════════════════════════════════════════════════════════════════════

-- «سجّل الحضور» · p_marks = { "<trainee uuid>": "present" | "late" | "excused" | "absent" }.
-- Draft saves only the register; approving (or saving an approved sheet) applies it to `attendance`,
-- which is what the trainee and the certificate conditions read. Locked 48h after the session ends.
create or replace function public.save_attendance(p_session uuid, p_marks jsonb, p_approve boolean, p_reason text default null)
returns int
language plpgsql security definer set search_path = '' as $$
declare
  u uuid;
  s public.course_sessions;
  sh public.attendance_sheets;
  k text;
  v text;
  tid uuid;
  n int := 0;
  missing int;
begin
  select * into s from public.course_sessions where id = p_session;
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
  u := public.require_course_manager(s.course_id);
  if s.status = 'cancelled' then raise exception 'invalid_state' using errcode = 'P0001'; end if;
  if now() < s.starts_at then raise exception 'session_not_started' using errcode = 'P0001'; end if;
  if public.session_is_locked(s.id) then raise exception 'attendance_locked' using errcode = 'P0001'; end if;
  if jsonb_typeof(p_marks) <> 'object' then raise exception 'invalid_input' using errcode = 'P0001'; end if;

  select * into sh from public.attendance_sheets where session_id = s.id for update;
  if found and sh.status = 'approved' then
    if char_length(coalesce(trim(p_reason), '')) < 5 then raise exception 'reason_required' using errcode = 'P0001'; end if;
    p_approve := true;
  end if;

  for k, v in select * from jsonb_each_text(p_marks) loop
    if v not in ('present', 'late', 'excused', 'absent') then raise exception 'invalid_input' using errcode = 'P0001'; end if;
    begin tid := k::uuid; exception when others then raise exception 'invalid_input' using errcode = 'P0001'; end;
    if not exists (select 1 from public.enrollments e where e.course_id = s.course_id and e.trainee_id = tid
                   and e.status in ('confirmed', 'in_progress', 'completed')) then
      raise exception 'not_enrolled' using errcode = 'P0001';
    end if;
    insert into public.attendance_marks (session_id, trainee_id, status, marked_by, updated_at)
    values (s.id, tid, v, u, now())
    on conflict (session_id, trainee_id) do update set status = excluded.status, marked_by = excluded.marked_by, updated_at = now();
    n := n + 1;
  end loop;

  insert into public.attendance_sheets (session_id, status, source, updated_at) values (s.id, 'draft', 'manual', now())
  on conflict (session_id) do update set updated_at = now();

  if p_approve then
    select count(*) into missing from public.enrollments e
    where e.course_id = s.course_id and e.status in ('confirmed', 'in_progress', 'completed')
      and not exists (select 1 from public.attendance_marks m where m.session_id = s.id and m.trainee_id = e.trainee_id);
    if missing > 0 then raise exception 'attendance_incomplete' using errcode = 'P0001'; end if;

    insert into public.attendance (session_id, trainee_id, method, checked_in_at)
    select m.session_id, m.trainee_id, 'manual', least(now(), s.ends_at) from public.attendance_marks m
    where m.session_id = s.id and m.status in ('present', 'late')
    on conflict (session_id, trainee_id) do nothing;
    delete from public.attendance a
    using public.attendance_marks m
    where a.session_id = s.id and m.session_id = s.id and m.trainee_id = a.trainee_id and m.status in ('absent', 'excused');
    update public.enrollments e set status = 'in_progress'
    where e.course_id = s.course_id and e.status = 'confirmed'
      and exists (select 1 from public.attendance_marks m where m.session_id = s.id and m.trainee_id = e.trainee_id and m.status in ('present', 'late'));
    update public.attendance_sheets set status = 'approved', approved_at = now(), approved_by = u, updated_at = now() where session_id = s.id;
    if sh.status = 'approved' then
      insert into public.course_operations (course_id, kind, actor_id, message, details, affected)
      values (s.course_id, 'attendance_edit', u, trim(p_reason), jsonb_build_object('session', s.id), n);
    end if;
  end if;
  return n;
end $$;

-- «حضور بالرمز» (4253:2): the session code the trainee check-in screen consumes (check_in()).
create or replace function public.create_attendance_code(p_session uuid)
returns table (code text, expires_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare s public.course_sessions; ac public.attendance_codes; c public.courses; new_code text;
begin
  select * into s from public.course_sessions where id = p_session;
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
  perform public.require_course_manager(s.course_id);
  select * into c from public.courses where id = s.course_id;
  if c.mode = 'recorded' or c.status = 'cancelled' or s.status = 'cancelled' then raise exception 'invalid_state' using errcode = 'P0001'; end if;
  if now() < s.starts_at - interval '30 minutes' then raise exception 'session_not_started' using errcode = 'P0001'; end if;
  if now() > s.ends_at + interval '30 minutes' then raise exception 'session_closed' using errcode = 'P0001'; end if;
  select * into ac from public.attendance_codes x where x.session_id = s.id and x.expires_at > now() + interval '5 minutes'
  order by x.expires_at desc limit 1;
  if found then return query select ac.code, ac.expires_at; return; end if;
  loop
    new_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    exit when not exists (select 1 from public.attendance_codes x where x.code = new_code);
  end loop;
  insert into public.attendance_codes (session_id, code, expires_at) values (s.id, new_code, s.ends_at + interval '30 minutes');
  insert into public.attendance_sheets (session_id, source) values (s.id, 'qr')
  on conflict (session_id) do update set source = case when public.attendance_sheets.status = 'draft' then 'qr' else public.attendance_sheets.source end;
  return query select new_code, s.ends_at + interval '30 minutes';
end $$;

-- «حضور مستورد من تقرير الجلسة» (4253:585 / 4253:1077): builds the register from the live-session joins
-- (join_live_session() records them). Returns 'completed' or 'failed' (the failure is stored, not raised).
create or replace function public.import_live_attendance(p_session uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare s public.course_sessions; c public.courses; u uuid; prov text;
begin
  select * into s from public.course_sessions where id = p_session;
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
  u := public.require_course_manager(s.course_id);
  select * into c from public.courses where id = s.course_id;
  if c.mode <> 'live_remote' or s.status = 'cancelled' then raise exception 'invalid_state' using errcode = 'P0001'; end if;
  if now() < s.starts_at then raise exception 'session_not_started' using errcode = 'P0001'; end if;
  if public.session_is_locked(s.id) then raise exception 'attendance_locked' using errcode = 'P0001'; end if;
  prov := case when s.meeting_url ilike '%zoom.%' then 'Zoom'
               when s.meeting_url ilike '%meet.google.%' then 'Google Meet'
               when s.meeting_url ilike '%teams.%' then 'Microsoft Teams'
               when s.meeting_url is not null then 'رابط الجلسة' end;
  if s.meeting_url is null then
    insert into public.attendance_sheets (session_id, source, import_status, import_provider, imported_at)
    values (s.id, 'import', 'failed', null, now())
    on conflict (session_id) do update set import_status = 'failed', imported_at = now(), updated_at = now();
    return 'failed';
  end if;
  if exists (select 1 from public.attendance_sheets h where h.session_id = s.id and h.status = 'approved') then
    raise exception 'invalid_state' using errcode = 'P0001';
  end if;
  insert into public.attendance_marks (session_id, trainee_id, status, marked_by, updated_at)
  select s.id, e.trainee_id,
         case when exists (select 1 from public.attendance a where a.session_id = s.id and a.trainee_id = e.trainee_id) then 'present' else 'absent' end,
         u, now()
  from public.enrollments e
  where e.course_id = s.course_id and e.status in ('confirmed', 'in_progress', 'completed')
  on conflict (session_id, trainee_id) do update set status = excluded.status, marked_by = excluded.marked_by, updated_at = now();
  insert into public.attendance_sheets (session_id, source, import_status, import_provider, imported_at)
  values (s.id, 'import', 'completed', prov, now())
  on conflict (session_id) do update set source = 'import', import_status = 'completed', import_provider = prov, imported_at = now(), updated_at = now();
  return 'completed';
end $$;

-- «اطلب فتح الرصد» (463:34053): recorded on the sheet for the support team.
create or replace function public.request_attendance_unlock(p_session uuid, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare s public.course_sessions;
begin
  select * into s from public.course_sessions where id = p_session;
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
  perform public.require_course_manager(s.course_id);
  if not public.session_is_locked(s.id) then raise exception 'invalid_state' using errcode = 'P0001'; end if;
  if char_length(coalesce(trim(p_reason), '')) < 10 or char_length(p_reason) > 1000 then raise exception 'invalid_input' using errcode = 'P0001'; end if;
  if exists (select 1 from public.attendance_sheets h where h.session_id = s.id and h.unlock_requested_at is not null) then
    raise exception 'unlock_already_requested' using errcode = 'P0001';
  end if;
  insert into public.attendance_sheets (session_id, unlock_requested_at, unlock_reason) values (s.id, now(), trim(p_reason))
  on conflict (session_id) do update set unlock_requested_at = now(), unlock_reason = trim(p_reason), updated_at = now();
end $$;

-- ═════════════════════════════════════════════════════════════════════════════════════════════════
-- Assignment grading (TRR-CRS-11)
-- ═════════════════════════════════════════════════════════════════════════════════════════════════

-- p_scores = { "<rubric id>": n } (or { "total": n } when the assignment has no rubric).
-- p_flag = «علّمها للمراجعة لاحقًا»: kept as a private draft, nothing reaches the trainee.
-- Otherwise the grade is published: accepted, or «يحتاج تعديلًا» below the pass score while attempts remain.
create or replace function public.grade_submission(p_submission uuid, p_scores jsonb, p_feedback text, p_flag boolean)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  u uuid;
  sub public.assignment_submissions;
  a public.assignments;
  item jsonb;
  val numeric;
  total numeric := 0;
  used int;
  st public.submission_status;
begin
  select * into sub from public.assignment_submissions where id = p_submission for update;
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
  select * into a from public.assignments where id = sub.assignment_id;
  u := public.require_course_manager(a.course_id);
  if exists (select 1 from public.course_result_approvals x where x.course_id = a.course_id) then
    raise exception 'results_locked' using errcode = 'P0001';
  end if;
  if jsonb_typeof(p_scores) <> 'object' or char_length(coalesce(p_feedback, '')) > 4000 then raise exception 'invalid_input' using errcode = 'P0001'; end if;

  if jsonb_array_length(a.rubric) > 0 then
    for item in select * from jsonb_array_elements(a.rubric) loop
      begin val := (p_scores ->> (item ->> 'id'))::numeric; exception when others then raise exception 'invalid_input' using errcode = 'P0001'; end;
      if val is null or val < 0 or val > (item ->> 'max')::numeric then raise exception 'invalid_score' using errcode = 'P0001'; end if;
      total := total + val;
    end loop;
  else
    begin val := (p_scores ->> 'total')::numeric; exception when others then raise exception 'invalid_input' using errcode = 'P0001'; end;
    if val is null or val < 0 or val > a.max_score then raise exception 'invalid_score' using errcode = 'P0001'; end if;
    total := val;
  end if;

  insert into public.submission_reviews (submission_id, reviewer_id, rubric_scores, score, feedback, flagged, updated_at)
  values (sub.id, u, p_scores, total, nullif(trim(p_feedback), ''), coalesce(p_flag, false), now())
  on conflict (submission_id) do update set reviewer_id = excluded.reviewer_id, rubric_scores = excluded.rubric_scores,
    score = excluded.score, feedback = excluded.feedback, flagged = excluded.flagged, updated_at = now();

  if coalesce(p_flag, false) then return 'flagged'; end if;

  select count(*) into used from public.assignment_submissions x where x.assignment_id = a.id and x.trainee_id = sub.trainee_id;
  st := case when a.pass_score is not null and total < a.pass_score
             then case when used < a.max_attempts then 'needs_revision'::public.submission_status else 'rejected' end
             else 'accepted' end;
  update public.assignment_submissions set status = st, score = round(total)::int, feedback = nullif(trim(p_feedback), ''),
    rubric_scores = p_scores, reviewed_at = now()
  where id = sub.id;
  perform public.notify(sub.trainee_id, 'assignment_reviewed',
                        case st when 'accepted' then 'قُيّم واجبك' when 'needs_revision' then 'واجبك يحتاج تعديلًا' else 'قُيّم واجبك' end,
                        a.title || ' — ' || round(total)::text || ' من ' || a.max_score::text, '/trainee/assignments/' || a.id);
  return st::text;
end $$;

-- «ذكّرها» for a trainee who has not submitted yet.
create or replace function public.remind_assignment(p_assignment uuid, p_trainee uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare a public.assignments;
begin
  select * into a from public.assignments where id = p_assignment;
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
  perform public.require_course_manager(a.course_id);
  if not exists (select 1 from public.enrollments e where e.course_id = a.course_id and e.trainee_id = p_trainee
                 and e.status in ('confirmed', 'in_progress')) then
    raise exception 'not_enrolled' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.assignment_submissions s where s.assignment_id = a.id and s.trainee_id = p_trainee) then
    raise exception 'invalid_state' using errcode = 'P0001';
  end if;
  perform public.notify(p_trainee, 'action_required', 'تذكير بتسليم واجب', a.title, '/trainee/assignments/' || a.id);
end $$;

-- ═════════════════════════════════════════════════════════════════════════════════════════════════
-- Results (TRR-RES-01) — weights from the Figma «احتساب الدرجات آليًا»: attendance 30 · assignments 40 · quizzes 30,
-- renormalised over the components the course has. Pass: attendance ≥ 75٪, assignments ≥ their pass scores, final ≥ 60٪.
-- ═════════════════════════════════════════════════════════════════════════════════════════════════

create or replace function public.course_result_rows(p_course uuid)
returns table (enrollment_id uuid, trainee_id uuid, attendance_percent int, assignment_points numeric, assignment_max numeric,
               quiz_percent int, final_percent int, outcome text)
language plpgsql stable security definer set search_path = '' as $$
declare
  n_sessions int; n_assign int; n_quiz int; pass_points numeric; max_points numeric;
begin
  perform public.require_course_manager(p_course);
  select count(*)::int into n_sessions from public.course_sessions s where s.course_id = p_course and s.status <> 'cancelled' and s.ends_at <= now();
  select count(*)::int, coalesce(sum(a.max_score), 0), coalesce(sum(a.pass_score), 0) into n_assign, max_points, pass_points
    from public.assignments a where a.course_id = p_course;
  select count(*)::int into n_quiz from public.quizzes q where q.course_id = p_course;

  return query
  with en as (
    select e.id, e.trainee_id from public.enrollments e
    where e.course_id = p_course and e.status in ('confirmed', 'in_progress', 'completed')
  ), att as (
    select en.id,
           case when n_sessions = 0 then null else
             (select count(*) from public.attendance t join public.course_sessions s on s.id = t.session_id
              where s.course_id = p_course and s.status <> 'cancelled' and s.ends_at <= now() and t.trainee_id = en.trainee_id)::numeric
             / nullif(n_sessions - (select count(*) from public.attendance_marks m join public.course_sessions s on s.id = m.session_id
                                     where s.course_id = p_course and s.status <> 'cancelled' and s.ends_at <= now()
                                       and m.trainee_id = en.trainee_id and m.status = 'excused'), 0) * 100 end as pct
    from en
  ), asg as (
    select en.id,
           case when n_assign = 0 then null else
             coalesce((select sum(b.best) from (
               select max(s.score) as best from public.assignment_submissions s join public.assignments a on a.id = s.assignment_id
               where a.course_id = p_course and s.trainee_id = en.trainee_id and s.reviewed_at is not null
               group by s.assignment_id) b), 0) end as pts
    from en
  ), qz as (
    select en.id,
           case when n_quiz = 0 then null else
             coalesce((select sum(b.best) from (
               select max(t.score_percent) as best from public.quiz_attempts t join public.quizzes q on q.id = t.quiz_id
               where q.course_id = p_course and t.trainee_id = en.trainee_id and t.submitted_at is not null
               group by t.quiz_id) b), 0)::numeric / n_quiz end as pct
    from en
  ), calc as (
    select en.id, en.trainee_id,
           least(100, round(att.pct))::int as att_pct,
           asg.pts,
           round(qz.pct)::int as qz_pct,
           round((coalesce(least(att.pct, 100), 0) * case when att.pct is null then 0 else 30 end
                  + coalesce(asg.pts / nullif(max_points, 0) * 100, 0) * case when asg.pts is null or max_points = 0 then 0 else 40 end
                  + coalesce(qz.pct, 0) * case when qz.pct is null then 0 else 30 end)
                 / nullif((case when att.pct is null then 0 else 30 end)
                          + (case when asg.pts is null or max_points = 0 then 0 else 40 end)
                          + (case when qz.pct is null then 0 else 30 end), 0))::int as fin
    from en join att on att.id = en.id join asg on asg.id = en.id join qz on qz.id = en.id
  )
  select calc.id, calc.trainee_id, calc.att_pct, calc.pts, case when n_assign = 0 then null else max_points end, calc.qz_pct,
         coalesce(calc.fin, 0),
         case when calc.att_pct is not null and calc.att_pct < 75 then 'below_attendance'
              when coalesce(calc.fin, 0) >= 60 and (calc.pts is null or pass_points = 0 or calc.pts >= pass_points) then 'passed'
              else 'failed' end
  from calc;
end $$;

-- «احسب من الحضور والواجبات» / «احفظ كمسودة»: recompute (keeping manual decisions unless p_reset) and apply
-- p_outcomes = { "<enrollment uuid>": "passed" | "failed" } overrides.
create or replace function public.save_course_results(p_course uuid, p_outcomes jsonb, p_reset boolean default false)
returns int
language plpgsql security definer set search_path = '' as $$
declare k text; v text; n int := 0;
begin
  perform public.require_course_manager(p_course);
  if exists (select 1 from public.course_result_approvals x where x.course_id = p_course) then
    raise exception 'results_locked' using errcode = 'P0001';
  end if;
  insert into public.course_results as cr (enrollment_id, course_id, trainee_id, attendance_percent, assignment_points, assignment_max,
                                           quiz_percent, final_percent, outcome, overridden, updated_at)
  select r.enrollment_id, p_course, r.trainee_id, r.attendance_percent, r.assignment_points, r.assignment_max, r.quiz_percent,
         r.final_percent, r.outcome, false, now()
  from public.course_result_rows(p_course) r
  on conflict (enrollment_id) do update set
    attendance_percent = excluded.attendance_percent, assignment_points = excluded.assignment_points,
    assignment_max = excluded.assignment_max, quiz_percent = excluded.quiz_percent, final_percent = excluded.final_percent,
    outcome = case when cr.overridden and not p_reset then cr.outcome else excluded.outcome end,
    overridden = cr.overridden and not p_reset, updated_at = now();
  -- Withdrawn/cancelled trainees leave the sheet.
  delete from public.course_results cr where cr.course_id = p_course
    and not exists (select 1 from public.enrollments e where e.id = cr.enrollment_id and e.status in ('confirmed', 'in_progress', 'completed'));

  if p_outcomes is not null and jsonb_typeof(p_outcomes) = 'object' then
    for k, v in select * from jsonb_each_text(p_outcomes) loop
      if v not in ('passed', 'failed') then raise exception 'invalid_input' using errcode = 'P0001'; end if;
      update public.course_results set outcome = v, overridden = true, updated_at = now()
      where course_id = p_course and enrollment_id::text = k and outcome is distinct from v;
    end loop;
  end if;
  select count(*) into n from public.course_results where course_id = p_course;
  return n;
end $$;

-- What still blocks approval (TRR-RES-01 «ثلاثة أمور تمنع الاعتماد», 463:34304).
create or replace function public.course_result_blockers(p_course uuid)
returns table (key text, count int, info jsonb)
language plpgsql stable security definer set search_path = '' as $$
declare n int; nx jsonb;
begin
  perform public.require_course_manager(p_course);
  select count(*)::int, jsonb_build_object('last_ends_at', max(s.ends_at), 'first_pending_position', min(s.position))
    into n, nx from public.course_sessions s where s.course_id = p_course and s.status <> 'cancelled' and s.ends_at > now();
  if n > 0 then return query select 'sessions_pending'::text, n, nx; end if;

  select count(*)::int, coalesce(jsonb_agg(jsonb_build_object('id', s.id, 'position', s.position, 'title', s.title, 'ends_at', s.ends_at) order by s.position), '[]')
    into n, nx from public.course_sessions s
    where s.course_id = p_course and s.status <> 'cancelled' and s.ends_at <= now()
      and not exists (select 1 from public.attendance_sheets h where h.session_id = s.id and h.status = 'approved');
  if n > 0 then return query select 'attendance_unrecorded'::text, n, nx; end if;

  select count(*)::int, coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'assignment_id', x.assignment_id, 'trainee_id', x.trainee_id)), '[]')
    into n, nx from public.assignment_submissions x join public.assignments a on a.id = x.assignment_id
    join public.enrollments e on e.course_id = a.course_id and e.trainee_id = x.trainee_id and e.status in ('confirmed', 'in_progress', 'completed')
    where a.course_id = p_course and x.reviewed_at is null
      and x.submitted_at = (select max(y.submitted_at) from public.assignment_submissions y where y.assignment_id = x.assignment_id and y.trainee_id = x.trainee_id);
  if n > 0 then return query select 'submissions_ungraded'::text, n, nx; end if;

  select count(*)::int, coalesce(jsonb_agg(e.trainee_id), '[]') into n, nx from public.enrollments e
    where e.course_id = p_course and e.status in ('confirmed', 'in_progress', 'completed')
      and not exists (select 1 from public.course_results r where r.enrollment_id = e.id);
  if n > 0 then return query select 'results_missing'::text, n, nx; end if;
end $$;

-- «اعتمد النتائج نهائيًا»: final. Enrollments complete, trainees are notified, certificates can be issued.
create or replace function public.approve_course_results(p_course uuid) returns int
language plpgsql security definer set search_path = '' as $$
declare u uuid := public.require_course_manager(p_course); c public.courses; np int; nf int; r record;
begin
  select * into c from public.courses where id = p_course for update;
  if c.status = 'cancelled' then raise exception 'invalid_state' using errcode = 'P0001'; end if;
  if exists (select 1 from public.course_result_approvals x where x.course_id = p_course) then
    raise exception 'results_locked' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.course_result_blockers(p_course)) then raise exception 'results_blocked' using errcode = 'P0001'; end if;
  select count(*) filter (where outcome = 'passed'), count(*) filter (where outcome <> 'passed') into np, nf
    from public.course_results where course_id = p_course;
  if np + nf = 0 then raise exception 'results_missing' using errcode = 'P0001'; end if;
  insert into public.course_result_approvals (course_id, approved_by, passed, failed) values (p_course, u, np, nf);
  update public.enrollments set status = 'completed', completed_at = coalesce(completed_at, now())
  where course_id = p_course and status in ('confirmed', 'in_progress');
  for r in select cr.trainee_id, cr.enrollment_id, cr.outcome from public.course_results cr where cr.course_id = p_course loop
    perform public.notify(r.trainee_id, 'results_published', 'اعتُمدت نتيجتك في «' || c.title || '»',
                          case when r.outcome = 'passed' then 'اجتزت الدورة — تصدر شهادتك قريبًا.' else 'لم تجتز الدورة هذه المرة.' end,
                          '/trainee/trainings/' || r.enrollment_id);
  end loop;
  return np;
end $$;

-- ═════════════════════════════════════════════════════════════════════════════════════════════════
-- Certificates (TRR-CRT-01/02) — BR-R2: issue_certificate() stamps the provider organization as issuer.
-- ═════════════════════════════════════════════════════════════════════════════════════════════════

create or replace function public.trainer_issue_certificates(p_course uuid, p_enrollments uuid[] default null)
returns table (issued int, skipped int)
language plpgsql security definer set search_path = '' as $$
declare r record; cid uuid; n int := 0; sk int := 0;
begin
  perform public.require_course_manager(p_course);
  if not exists (select 1 from public.course_result_approvals x where x.course_id = p_course) then
    raise exception 'results_not_approved' using errcode = 'P0001';
  end if;
  if p_enrollments is not null and exists (
       select 1 from unnest(p_enrollments) as t(id)
       where not exists (select 1 from public.course_results cr join public.enrollments e on e.id = cr.enrollment_id
                         where cr.enrollment_id = t.id and cr.course_id = p_course and cr.outcome = 'passed'
                           and e.status not in ('withdrawn', 'cancelled', 'access_revoked'))) then
    raise exception 'certificate_not_eligible' using errcode = 'P0001';
  end if;
  for r in select cr.enrollment_id from public.course_results cr join public.enrollments e on e.id = cr.enrollment_id
           where cr.course_id = p_course and cr.outcome = 'passed' and e.status not in ('withdrawn', 'cancelled', 'access_revoked')
             and (p_enrollments is null or cr.enrollment_id = any (p_enrollments)) loop
    cid := public.issue_certificate(r.enrollment_id);
    if cid is null then sk := sk + 1; else n := n + 1; end if;
    update public.enrollments set status = 'completed', completed_at = coalesce(completed_at, now())
    where id = r.enrollment_id and status in ('confirmed', 'in_progress');
  end loop;
  return query select n, sk;
end $$;

-- Program completion status for the trainees of this course (4256:2): one row per trainee and program course.
create or replace function public.program_certificate_status(p_course uuid)
returns table (trainee_id uuid, trainee_name text, course_id uuid, course_title text, course_status text, issued boolean)
language plpgsql stable security definer set search_path = '' as $$
declare c public.courses;
begin
  perform public.require_course_manager(p_course);
  select * into c from public.courses where id = p_course;
  return query
    with trainees as (
      select distinct e.trainee_id from public.enrollments e
      where e.course_id = p_course and e.status in ('confirmed', 'in_progress', 'completed')
    ), pcourses as (
      select k.id, k.title, k.starts_at from public.courses k where k.program_version_id = c.program_version_id and k.status <> 'cancelled'
    )
    select t.trainee_id, coalesce(nullif(p.full_name, ''), 'متدرب'), pc.id, pc.title,
           case when exists (select 1 from public.certificates x where x.course_id = pc.id and x.trainee_id = t.trainee_id and x.status = 'issued') then 'completed'
                when exists (select 1 from public.enrollments e where e.course_id = pc.id and e.trainee_id = t.trainee_id
                             and e.status in ('confirmed', 'in_progress', 'completed', 'pending_provider')) then 'in_progress'
                else 'not_started' end,
           exists (select 1 from public.program_certificates g where g.program_version_id = c.program_version_id and g.trainee_id = t.trainee_id)
    from trainees t join public.profiles p on p.id = t.trainee_id cross join pcourses pc
    order by 2, pc.starts_at nulls last, pc.title;
end $$;

create or replace function public.issue_program_certificates(p_course uuid) returns int
language plpgsql security definer set search_path = '' as $$
declare u uuid := public.require_course_manager(p_course); c public.courses; pr public.programs; r record; n int := 0; gid uuid;
begin
  select * into c from public.courses where id = p_course;
  select * into pr from public.programs where id = c.program_id;
  for r in
    select s.trainee_id, min(s.trainee_name) as trainee_name from public.program_certificate_status(p_course) s
    group by s.trainee_id
    having bool_and(s.course_status = 'completed') and not bool_or(s.issued)
  loop
    insert into public.program_certificates (program_id, program_version_id, trainee_id, issuer_organization_id, issued_by, trainee_name, program_title)
    values (pr.id, c.program_version_id, r.trainee_id, coalesce(pr.organization_id, c.organization_id), u, r.trainee_name, pr.title)
    on conflict (program_version_id, trainee_id) do nothing
    returning id into gid;
    if gid is not null then
      n := n + 1;
      perform public.notify(r.trainee_id, 'certificate_issued', 'صدرت شهادة إتمام البرنامج', pr.title, '/trainee/certificates');
    end if;
  end loop;
  if n = 0 then raise exception 'no_eligible_trainees' using errcode = 'P0001'; end if;
  return n;
end $$;

-- ═════════════════════════════════════════════════════════════════════════════════════════════════
-- Ratings (TRR-RTG-01/02/03)
-- ═════════════════════════════════════════════════════════════════════════════════════════════════

-- «أرسل الرد نهائيًا» / «احفظ كمسودة» / «لا أريد الرد». One reply per rating, final once published.
create or replace function public.save_rating_reply(p_rating uuid, p_body text, p_action text) returns text
language plpgsql security definer set search_path = '' as $$
declare u uuid; r public.course_ratings; cur public.rating_replies; body text := nullif(trim(p_body), '');
begin
  select * into r from public.course_ratings where id = p_rating;
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
  u := public.require_course_manager(r.course_id);
  if p_action not in ('draft', 'publish', 'skip') then raise exception 'invalid_input' using errcode = 'P0001'; end if;
  select * into cur from public.rating_replies where rating_id = r.id for update;
  if found and cur.status = 'published' then raise exception 'reply_final' using errcode = 'P0001'; end if;
  if char_length(coalesce(body, '')) > 1500 then raise exception 'invalid_input' using errcode = 'P0001'; end if;
  if p_action = 'publish' and char_length(coalesce(body, '')) < 10 then raise exception 'reply_too_short' using errcode = 'P0001'; end if;
  insert into public.rating_replies (rating_id, author_id, body, status, published_at, updated_at)
  values (r.id, u, body, case p_action when 'publish' then 'published' when 'skip' then 'skipped' else 'draft' end,
          case when p_action = 'publish' then now() end, now())
  on conflict (rating_id) do update set author_id = excluded.author_id, body = coalesce(excluded.body, public.rating_replies.body),
    status = excluded.status, published_at = excluded.published_at, updated_at = now();
  if p_action = 'publish' then
    perform public.notify(r.trainee_id, 'rating_reply', 'ردّ المدرب على تقييمك', left(body, 200), '/trainee/ratings');
  end if;
  return case p_action when 'publish' then 'published' when 'skip' then 'skipped' else 'draft' end;
end $$;

create or replace function public.request_rating_review(p_rating uuid, p_reason text, p_details text, p_evidence_path text default null)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare u uuid; r public.course_ratings; rid uuid;
begin
  select * into r from public.course_ratings where id = p_rating;
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
  u := public.require_course_manager(r.course_id);
  if p_reason not in ('abusive', 'not_attended', 'private_data', 'duplicate') then raise exception 'invalid_input' using errcode = 'P0001'; end if;
  if char_length(coalesce(trim(p_details), '')) < 20 or char_length(p_details) > 2000 then raise exception 'invalid_input' using errcode = 'P0001'; end if;
  if p_evidence_path is not null and split_part(p_evidence_path, '/', 1) <> u::text then raise exception 'forbidden' using errcode = 'P0001'; end if;
  if exists (select 1 from public.rating_review_requests x where x.rating_id = r.id and x.status = 'under_review') then
    raise exception 'review_already_requested' using errcode = 'P0001';
  end if;
  insert into public.rating_review_requests (rating_id, requester_id, reason, details, evidence_path)
  values (r.id, u, p_reason, trim(p_details), p_evidence_path) returning id into rid;
  return rid;
end $$;

-- «اطلب تقييمًا من ٦ متبقين»: at most once every 3 days per course.
create or replace function public.request_course_ratings(p_course uuid) returns int
language plpgsql security definer set search_path = '' as $$
declare u uuid := public.require_course_manager(p_course); c public.courses; r record; n int := 0;
begin
  select * into c from public.courses where id = p_course;
  if exists (select 1 from public.course_operations o where o.course_id = p_course and o.kind = 'rating_request' and o.created_at > now() - interval '3 days') then
    raise exception 'recently_requested' using errcode = 'P0001';
  end if;
  for r in select e.id, e.trainee_id from public.enrollments e
           where e.course_id = p_course and e.status in ('in_progress', 'completed')
             and not exists (select 1 from public.course_ratings x where x.enrollment_id = e.id) loop
    perform public.notify(r.trainee_id, 'action_required', 'قيّم دورة «' || c.title || '»', 'رأيك يساعد المدرب والمتدربين القادمين.',
                          '/trainee/ratings/new?enrollment=' || r.id);
    n := n + 1;
  end loop;
  if n = 0 then raise exception 'nobody_to_notify' using errcode = 'P0001'; end if;
  insert into public.course_operations (course_id, kind, actor_id, affected) values (p_course, 'rating_request', u, n);
  return n;
end $$;

-- «راسل الجميع / راسل المحددين / راسل قائمة الانتظار / نبّههما الآن»: a notification to the chosen audience.
create or replace function public.notify_course_trainees(p_course uuid, p_audience text, p_body text, p_trainees uuid[] default null)
returns int
language plpgsql security definer set search_path = '' as $$
declare u uuid := public.require_course_manager(p_course); c public.courses; r record; n int := 0;
begin
  select * into c from public.courses where id = p_course;
  if p_audience not in ('enrolled', 'waitlist', 'selected') then raise exception 'invalid_input' using errcode = 'P0001'; end if;
  if char_length(coalesce(trim(p_body), '')) < 5 or char_length(p_body) > 1000 then raise exception 'invalid_input' using errcode = 'P0001'; end if;
  for r in
    select e.id as ref, e.trainee_id, '/trainee/trainings/' || e.id as link from public.enrollments e
    where p_audience in ('enrolled', 'selected') and e.course_id = p_course
      and e.status in ('pending_provider', 'confirmed', 'in_progress', 'completed')
      and (p_audience = 'enrolled' or e.trainee_id = any (coalesce(p_trainees, '{}')))
    union all
    select w.id, w.trainee_id, '/trainee/waitlist/' || w.id from public.waitlist_entries w
    where p_audience = 'waitlist' and w.course_id = p_course and w.status in ('waiting', 'invited')
  loop
    perform public.notify(r.trainee_id, 'message', 'رسالة من مدرب «' || c.title || '»', left(trim(p_body), 500), r.link);
    n := n + 1;
  end loop;
  if n = 0 then raise exception 'nobody_to_notify' using errcode = 'P0001'; end if;
  insert into public.course_operations (course_id, kind, actor_id, message, details, affected)
  values (p_course, 'broadcast', u, trim(p_body), jsonb_build_object('audience', p_audience), n);
  return n;
end $$;

-- ═════════════════════════════════════════════════════════════════════════════════════════════════
-- Privileges
-- ═════════════════════════════════════════════════════════════════════════════════════════════════
revoke execute on function public.require_course_manager(uuid) from public, anon, authenticated;
revoke execute on function public.trainer_invite_waitlisted(uuid, int) from public, anon, authenticated;
revoke execute on function public.session_is_locked(uuid) from public, anon;
revoke execute on function public.course_people(uuid) from public, anon;
revoke execute on function public.update_course_capacity(uuid, int) from public, anon;
revoke execute on function public.grant_waitlist_seat(uuid) from public, anon;
revoke execute on function public.release_unpaid_hold(uuid) from public, anon;
revoke execute on function public.postpone_course(uuid, date, date, text, text) from public, anon;
revoke execute on function public.cancel_course(uuid, text, text) from public, anon;
revoke execute on function public.refund_quote(uuid) from public, anon;
revoke execute on function public.save_attendance(uuid, jsonb, boolean, text) from public, anon;
revoke execute on function public.create_attendance_code(uuid) from public, anon;
revoke execute on function public.import_live_attendance(uuid) from public, anon;
revoke execute on function public.request_attendance_unlock(uuid, text) from public, anon;
revoke execute on function public.grade_submission(uuid, jsonb, text, boolean) from public, anon;
revoke execute on function public.remind_assignment(uuid, uuid) from public, anon;
revoke execute on function public.course_result_rows(uuid) from public, anon;
revoke execute on function public.save_course_results(uuid, jsonb, boolean) from public, anon;
revoke execute on function public.course_result_blockers(uuid) from public, anon;
revoke execute on function public.approve_course_results(uuid) from public, anon;
revoke execute on function public.trainer_issue_certificates(uuid, uuid[]) from public, anon;
revoke execute on function public.program_certificate_status(uuid) from public, anon;
revoke execute on function public.issue_program_certificates(uuid) from public, anon;
revoke execute on function public.save_rating_reply(uuid, text, text) from public, anon;
revoke execute on function public.request_rating_review(uuid, text, text, text) from public, anon;
revoke execute on function public.request_course_ratings(uuid) from public, anon;
revoke execute on function public.notify_course_trainees(uuid, text, text, uuid[]) from public, anon;

grant execute on function
  public.session_is_locked(uuid),
  public.course_people(uuid),
  public.update_course_capacity(uuid, int),
  public.grant_waitlist_seat(uuid),
  public.release_unpaid_hold(uuid),
  public.postpone_course(uuid, date, date, text, text),
  public.cancel_course(uuid, text, text),
  public.refund_quote(uuid),
  public.save_attendance(uuid, jsonb, boolean, text),
  public.create_attendance_code(uuid),
  public.import_live_attendance(uuid),
  public.request_attendance_unlock(uuid, text),
  public.grade_submission(uuid, jsonb, text, boolean),
  public.remind_assignment(uuid, uuid),
  public.course_result_rows(uuid),
  public.save_course_results(uuid, jsonb, boolean),
  public.course_result_blockers(uuid),
  public.approve_course_results(uuid),
  public.trainer_issue_certificates(uuid, uuid[]),
  public.program_certificate_status(uuid),
  public.issue_program_certificates(uuid),
  public.save_rating_reply(uuid, text, text),
  public.request_rating_review(uuid, text, text, text),
  public.request_course_ratings(uuid),
  public.notify_course_trainees(uuid, text, text, uuid[])
to authenticated;
