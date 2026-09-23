-- Trainings file, money path and waitlist (TRN-QUE-01, TRN-MYE-01..03, TRN-RFD-01/02, TRN-DSP-01/02, TRN-WTL-01/02).
-- Additive only: a queue-dismissal table, one nullable column, a widened dispute-reason check and new RPCs.
-- request_refund is replaced (same signature) so the refunded amount follows the published refund tiers.

-- ── «ليس الآن» / «إخفاء من الطابور» on queue items (TRN-QUE-01) ──────────────
create table public.queue_dismissals (
  user_id uuid not null references public.profiles (id) on delete cascade,
  item_key text not null check (item_key ~ '^[a-z_]{2,24}:[0-9a-f-]{36}$'),
  hidden_until timestamptz, -- null = hidden for good
  created_at timestamptz not null default now(),
  primary key (user_id, item_key)
);
alter table public.queue_dismissals enable row level security;
create policy queue_dismissals_own on public.queue_dismissals for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── Refund requests: the trainee may cancel while under review (TRN-RFD-02) ─
alter table public.refund_requests add column cancelled_at timestamptz;

-- ── Dispute reasons from TRN-DSP-01 ("لماذا ترى القرار غير صحيح؟") ─────────
alter table public.disputes drop constraint disputes_reason_check;
alter table public.disputes add constraint disputes_reason_check check (reason in (
  'double_charge', 'not_delivered', 'wrong_amount', 'refund_not_received', 'other',
  'withdrawal_date', 'course_cancelled'));

-- ── Refund tiers (TRN-MYE-03 · شرائح الاسترداد, TRN-RFD-01) ─────────────────
-- In-person / live: ≥ 7 days before the first session → 100٪, 3–6 days → 50٪, otherwise 0.
-- Withdrawn enrollments are measured at the withdrawal time. Recorded: 100٪ within 14 days of purchase.
-- Courses cancelled by the provider and requests still waiting for the provider are refunded in full.
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
begin
  select * into e from public.enrollments where id = p_enrollment and trainee_id = u;
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
  select * into c from public.courses where id = e.course_id;
  select min(s.starts_at) into first_start from public.course_sessions s where s.course_id = c.id and s.status <> 'cancelled';
  first_start := coalesce(first_start, c.starts_at);
  ref := case when e.status in ('withdrawn', 'cancelled', 'access_revoked') then coalesce(e.ended_at, now()) else now() end;

  if e.price_paid <= 0 or not exists (select 1 from public.payments p where p.enrollment_id = e.id and p.status = 'succeeded') then
    t := 'nothing_paid';
  elsif c.status = 'cancelled' or (e.status = 'cancelled' and coalesce(e.end_reason, '') <> 'hold_expired') then
    pct := 100; t := 'course_cancelled';
  elsif e.status = 'pending_provider' then
    pct := 100; t := 'pending_provider';
  elsif c.mode = 'recorded' then
    win := coalesce(e.confirmed_at, e.created_at) + interval '14 days';
    if ref <= win then pct := 100; t := 'recorded_window'; else t := 'recorded_expired'; end if;
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

-- Same signature as before; the amount now follows refund_quote and ineligible requests are refused.
create or replace function public.request_refund(p_enrollment uuid, p_reason text, p_details text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare u uuid := public.require_user(); e public.enrollments; c public.courses; q record; rid uuid; cert boolean;
begin
  select * into e from public.enrollments where id = p_enrollment and trainee_id = u for update;
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
  if e.price_paid <= 0 or not exists (select 1 from public.payments p where p.enrollment_id = e.id and p.status = 'succeeded') then
    raise exception 'nothing_to_refund' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.refund_requests r where r.enrollment_id = e.id and r.status = 'under_review') then
    raise exception 'refund_already_requested' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.refund_requests r where r.enrollment_id = e.id and r.status = 'approved') then
    raise exception 'already_refunded' using errcode = 'P0001';
  end if;
  select * into c from public.courses where id = e.course_id;
  -- Scheduled courses are refunded after withdrawing (the tier is measured at the withdrawal).
  if c.mode <> 'recorded' and c.status <> 'cancelled' and e.status in ('confirmed', 'in_progress', 'completed') then
    raise exception 'withdraw_first' using errcode = 'P0001';
  end if;
  select * into q from public.refund_quote(e.id);
  if q.percent <= 0 then raise exception 'refund_not_eligible' using errcode = 'P0001'; end if;
  select exists (select 1 from public.certificates x where x.enrollment_id = e.id and x.status = 'issued') into cert;
  insert into public.refund_requests (enrollment_id, trainee_id, reason, details, amount, requires_admin)
  values (e.id, u, p_reason, nullif(trim(p_details), ''), q.amount, cert)
  returning id into rid;
  return rid;
end $$;

-- «إلغاء طلب الاسترداد» while it is still under review (TRN-RFD-02).
create or replace function public.cancel_refund_request(p_refund uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare u uuid := public.require_user(); r public.refund_requests;
begin
  select * into r from public.refund_requests where id = p_refund and trainee_id = u for update;
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
  if r.status <> 'under_review' or r.cancelled_at is not null then raise exception 'invalid_state' using errcode = 'P0001'; end if;
  update public.refund_requests set status = 'rejected', cancelled_at = now(), decided_at = now(),
    decision_note = 'cancelled_by_trainee' where id = r.id;
end $$;

-- «اسحب النزاع» before a decision (TRN-DSP-01).
create or replace function public.withdraw_dispute(p_dispute uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare u uuid := public.require_user(); d public.disputes;
begin
  select * into d from public.disputes where id = p_dispute and trainee_id = u for update;
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
  if d.status not in ('open', 'under_review') then raise exception 'invalid_state' using errcode = 'P0001'; end if;
  update public.disputes set status = 'closed', resolution = 'withdrawn_by_trainee' where id = d.id;
end $$;

-- «ترتيبك ٣ من ٧» for the trainee's own waitlist entries (other trainees stay hidden by RLS).
create or replace function public.my_waitlist_positions()
returns table (entry_id uuid, queue_position int, total int)
language sql stable security definer set search_path = '' as $$
  select w.id,
         (select count(*)::int from public.waitlist_entries x
          where x.course_id = w.course_id and x.status = 'waiting' and x.created_at <= w.created_at),
         (select count(*)::int from public.waitlist_entries x where x.course_id = w.course_id and x.status = 'waiting')
  from public.waitlist_entries w
  where w.trainee_id = public.require_user() and w.status = 'waiting';
$$;

-- «الدخول إلى الجلسة» (TRN-MYE-02 · الجلسة المباشرة): attendance is recorded on entry.
create or replace function public.join_live_session(p_session uuid)
returns table (meeting_url text, checked_in_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare u uuid := public.require_user(); s public.course_sessions; c public.courses; v_at timestamptz;
begin
  select * into s from public.course_sessions where id = p_session;
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
  select * into c from public.courses where id = s.course_id;
  if c.mode <> 'live_remote' or not public.is_enrolled(s.course_id) then raise exception 'not_enrolled' using errcode = 'P0001'; end if;
  if s.status = 'cancelled' or s.status = 'ended' or now() > s.ends_at then raise exception 'session_closed' using errcode = 'P0001'; end if;
  if now() < s.starts_at - interval '10 minutes' or s.status <> 'live' then raise exception 'session_not_live' using errcode = 'P0001'; end if;
  if s.meeting_url is null then raise exception 'meeting_unavailable' using errcode = 'P0001'; end if;
  insert into public.attendance (session_id, trainee_id, method) values (s.id, u, 'online')
  on conflict (session_id, trainee_id) do nothing;
  select a.checked_in_at into v_at from public.attendance a where a.session_id = s.id and a.trainee_id = u;
  update public.enrollments set status = 'in_progress' where course_id = s.course_id and trainee_id = u and status = 'confirmed';
  return query select s.meeting_url, v_at;
end $$;

revoke execute on function public.refund_quote(uuid) from public, anon, authenticated;
revoke execute on function public.cancel_refund_request(uuid) from public, anon, authenticated;
revoke execute on function public.withdraw_dispute(uuid) from public, anon, authenticated;
revoke execute on function public.my_waitlist_positions() from public, anon, authenticated;
revoke execute on function public.join_live_session(uuid) from public, anon, authenticated;
revoke execute on function public.request_refund(uuid, text, text) from public, anon;
grant execute on function public.refund_quote(uuid) to authenticated;
grant execute on function public.cancel_refund_request(uuid) to authenticated;
grant execute on function public.withdraw_dispute(uuid) to authenticated;
grant execute on function public.my_waitlist_positions() to authenticated;
grant execute on function public.join_live_session(uuid) to authenticated;
grant execute on function public.request_refund(uuid, text, text) to authenticated;
