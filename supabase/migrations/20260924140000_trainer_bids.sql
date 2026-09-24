-- TRR-BID-01…05 · Training requests from requester organizations, trainer bids, decisions and negotiation.
-- Additive only. Requester organizations (organization_kind 'requester') post requests; trainers see open
-- requests and bid; organization members decide and negotiate through security-definer RPCs, so the future
-- requester workspace can use these tables and functions as they are.

-- ─── Training requests (posted by a requester organization) ─────────────────────────────────────────────
create table public.training_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  created_by uuid references public.profiles (id) on delete set null,
  title text not null check (char_length(title) between 3 and 160),
  summary text not null default '' check (char_length(summary) <= 4000),
  -- Same vocabulary as trainer_profiles.specialties (used for matching).
  field text not null check (field in ('management', 'technology', 'marketing', 'design', 'finance', 'hr', 'safety', 'soft-skills')),
  audience text check (char_length(audience) <= 160),
  seats integer not null check (seats between 1 and 10000),
  mode public.course_mode not null check (mode in ('in_person', 'live_remote')),
  city text check (char_length(city) <= 80),
  venue text check (char_length(venue) <= 160),
  venue_area text check (char_length(venue_area) <= 160),
  starts_on date not null,
  ends_on date not null,
  days integer not null check (days between 1 and 60),
  hours_per_day numeric(4, 1) check (hours_per_day > 0 and hours_per_day <= 12),
  budget_min numeric(12, 2) not null check (budget_min >= 0),
  budget_max numeric(12, 2) not null,
  currency text not null default 'SAR',
  payment_terms text not null default 'single_after' check (payment_terms in ('single_after', 'half_upfront', 'per_day')),
  requirements text[] not null default '{}' check (cardinality(requirements) <= 20),
  bids_close_at timestamptz not null,
  status text not null default 'open' check (status in ('draft', 'open', 'closed', 'awarded', 'cancelled')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on >= starts_on),
  check (budget_max >= budget_min)
);
create index training_requests_org_idx on public.training_requests (organization_id, created_at desc);
create index training_requests_created_by_idx on public.training_requests (created_by);
create index training_requests_open_idx on public.training_requests (status, bids_close_at);

-- ─── Bids / offers from trainers ────────────────────────────────────────────────────────────────────────
create sequence public.training_bid_ref_seq;

create table public.training_bids (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique
    default ('OFR-' || to_char(now() at time zone 'Asia/Riyadh', 'YYYY') || '-' || lpad(nextval('public.training_bid_ref_seq')::text, 6, '0')),
  request_id uuid not null references public.training_requests (id) on delete cascade,
  trainer_id uuid not null references public.profiles (id) on delete cascade,
  program_id uuid references public.programs (id) on delete set null,
  -- Original offer terms (frozen once submitted). Negotiated changes live in agreed_terms.
  price numeric(12, 2) check (price > 0),
  hours numeric(5, 1) check (hours > 0 and hours <= 500),
  days integer check (days between 1 and 60),
  starts_on date,
  ends_on date,
  payment_terms text check (payment_terms in ('single_after', 'half_upfront', 'per_day')),
  message text check (char_length(message) <= 4000),
  attachment_path text,
  attachment_name text check (char_length(attachment_name) <= 200),
  committed_at timestamptz,
  status text not null default 'draft'
    check (status in ('draft', 'submitted', 'shortlisted', 'accepted', 'rejected', 'withdrawn', 'expired')),
  submitted_at timestamptz,
  decided_at timestamptz,
  decided_by uuid references public.profiles (id) on delete set null,
  decision_reason text check (decision_reason in (
    'sector_experience', 'price', 'dates', 'other_trainer', 'scope', 'closest_experience', 'best_value',
    'detailed_proposal', 'availability', 'other')),
  decision_comment text check (char_length(decision_comment) <= 2000),
  -- Organization feedback lines shown on TRR-BID-04: [{"tone":"success|warning","title":"…","body":"…"}].
  decision_notes jsonb not null default '[]'::jsonb check (jsonb_typeof(decision_notes) = 'array'),
  withdrawn_at timestamptz,
  withdraw_reason text check (withdraw_reason in ('schedule_conflict', 'price_change', 'not_available', 'other')),
  withdraw_note text check (char_length(withdraw_note) <= 500),
  withdrawn_after_accept boolean not null default false,
  -- Accepted bids must be contracted before contract_due_at (7 days). Negotiation pauses the clock.
  contract_due_at timestamptz,
  contract_paused_at timestamptz,
  contracted_at timestamptz,
  agreed_terms jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (request_id, trainer_id),
  check (ends_on is null or starts_on is null or ends_on >= starts_on)
);
create index training_bids_trainer_idx on public.training_bids (trainer_id, updated_at desc);
create index training_bids_request_idx on public.training_bids (request_id, status);
create index training_bids_program_idx on public.training_bids (program_id);
create index training_bids_decided_by_idx on public.training_bids (decided_by);

-- ─── Negotiation after acceptance (TRR-BID-05) ─────────────────────────────────────────────────────────
create table public.bid_negotiations (
  id uuid primary key default gen_random_uuid(),
  bid_id uuid not null references public.training_bids (id) on delete cascade,
  status text not null default 'draft'
    check (status in ('draft', 'awaiting_org', 'countered', 'agreed', 'rejected', 'declined', 'expired', 'withdrawn', 'cancelled')),
  round integer not null default 1 check (round between 1 and 2),
  -- Unsent proposal: {"price":{"value":6000,"reason":"…"},"dates":{"value":{"starts_on":"…","ends_on":"…"},"reason":"…"}}
  draft_terms jsonb not null default '{}'::jsonb check (jsonb_typeof(draft_terms) = 'object'),
  draft_message text check (char_length(draft_message) <= 2000),
  -- Deadline of whoever acts next (72 hours per step).
  respond_by timestamptz,
  outcome_at timestamptz,
  outcome_by text check (outcome_by in ('trainer', 'org', 'system')),
  outcome_reason text check (char_length(outcome_reason) <= 1000),
  agreed_terms jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index bid_negotiations_bid_idx on public.bid_negotiations (bid_id, created_at desc);
create unique index bid_negotiations_one_open on public.bid_negotiations (bid_id) where status in ('draft', 'awaiting_org', 'countered');
create index bid_negotiations_due_idx on public.bid_negotiations (status, respond_by);

create table public.bid_negotiation_rounds (
  id uuid primary key default gen_random_uuid(),
  negotiation_id uuid not null references public.bid_negotiations (id) on delete cascade,
  round integer not null check (round between 1 and 2),
  base_terms jsonb not null,
  proposal jsonb not null check (jsonb_typeof(proposal) = 'object'),
  message text check (char_length(message) <= 2000),
  sent_at timestamptz not null default now(),
  respond_by timestamptz not null,
  response text check (response in ('accepted', 'countered', 'rejected', 'expired', 'withdrawn')),
  counter jsonb check (counter is null or jsonb_typeof(counter) = 'object'),
  response_reason text check (char_length(response_reason) <= 1000),
  responded_at timestamptz,
  responded_by uuid references public.profiles (id) on delete set null,
  unique (negotiation_id, round)
);
create index bid_negotiation_rounds_responded_by_idx on public.bid_negotiation_rounds (responded_by);

-- «راسل الجهة»: a bid's conversation between the trainer and the organization's members.
alter table public.conversations add column if not exists bid_id uuid references public.training_bids (id) on delete set null;
create index if not exists conversations_bid_idx on public.conversations (bid_id);

create trigger training_requests_touch before update on public.training_requests
  for each row execute function public.touch_updated_at();
create trigger training_bids_touch before update on public.training_bids
  for each row execute function public.touch_updated_at();
create trigger bid_negotiations_touch before update on public.bid_negotiations
  for each row execute function public.touch_updated_at();

-- ─── Helpers ────────────────────────────────────────────────────────────────────────────────────────────
create or replace function public.request_org(p_request uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select organization_id from public.training_requests where id = p_request;
$$;

create or replace function public.has_bid_on_request(p_request uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.training_bids b where b.request_id = p_request and b.trainer_id = auth.uid());
$$;

-- Owner trainer, or a member of the requesting organization (never for drafts).
create or replace function public.can_see_bid(p_bid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.training_bids b join public.training_requests r on r.id = b.request_id
    where b.id = p_bid
      and (b.trainer_id = auth.uid() or (b.status <> 'draft' and public.is_org_member(r.organization_id))));
$$;

-- Effective terms of a bid: original offer overlaid with negotiated agreement.
create or replace function public.bid_terms(b public.training_bids) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'price', b.price, 'days', b.days, 'hours', b.hours,
    'starts_on', b.starts_on, 'ends_on', b.ends_on, 'payment_terms', b.payment_terms) || coalesce(b.agreed_terms, '{}'::jsonb);
$$;

-- Applies {"price":{"value":…},"duration":{"value":{"days","hours"}},"dates":{"value":{"starts_on","ends_on"}},
-- "payment_terms":{"value":…}} on top of flat terms.
create or replace function public.apply_bid_terms(base jsonb, changes jsonb) returns jsonb
language plpgsql immutable set search_path = '' as $$
declare t jsonb := base;
begin
  if changes ? 'price' then t := t || jsonb_build_object('price', changes #> '{price,value}'); end if;
  if changes ? 'duration' then t := t || (changes #> '{duration,value}'); end if;
  if changes ? 'dates' then t := t || (changes #> '{dates,value}'); end if;
  if changes ? 'payment_terms' then t := t || jsonb_build_object('payment_terms', changes #> '{payment_terms,value}'); end if;
  return t;
end $$;

-- Validates a set of proposed term changes against the current terms. Raises P0001 codes.
create or replace function public.validate_bid_terms(current_terms jsonb, changes jsonb, need_reason boolean) returns void
language plpgsql stable set search_path = '' as $$
declare k text; v jsonb;
begin
  if changes is null or jsonb_typeof(changes) <> 'object' or changes = '{}'::jsonb then
    raise exception 'negotiation_empty' using errcode = 'P0001';
  end if;
  for k, v in select * from jsonb_each(changes) loop
    if k not in ('price', 'duration', 'dates', 'payment_terms') then raise exception 'term_locked' using errcode = 'P0001'; end if;
    if need_reason and char_length(trim(coalesce(v ->> 'reason', ''))) < 5 then
      raise exception 'negotiation_reason_required' using errcode = 'P0001';
    end if;
    if k = 'price' then
      if jsonb_typeof(v -> 'value') <> 'number' or (v ->> 'value')::numeric <= 0 or (v ->> 'value')::numeric > 10000000 then
        raise exception 'invalid_term' using errcode = 'P0001'; end if;
    elsif k = 'duration' then
      if coalesce((v #>> '{value,days}')::int, 0) not between 1 and 60 or coalesce((v #>> '{value,hours}')::numeric, 0) not between 1 and 500 then
        raise exception 'invalid_term' using errcode = 'P0001'; end if;
    elsif k = 'dates' then
      if (v #>> '{value,starts_on}') is null or (v #>> '{value,ends_on}') is null
         or (v #>> '{value,ends_on}')::date < (v #>> '{value,starts_on}')::date
         or (v #>> '{value,starts_on}')::date < (now() at time zone 'Asia/Riyadh')::date then
        raise exception 'invalid_dates' using errcode = 'P0001'; end if;
    elsif k = 'payment_terms' then
      if (v ->> 'value') not in ('single_after', 'half_upfront', 'per_day') then raise exception 'invalid_term' using errcode = 'P0001'; end if;
    end if;
  end loop;
  if public.apply_bid_terms(current_terms, changes) = current_terms then
    raise exception 'negotiation_no_change' using errcode = 'P0001';
  end if;
end $$;

-- Resumes the contract clock paused by a negotiation (the deadline moves by the paused time).
create or replace function public.resume_bid_contract_clock(p_bid uuid) returns void
language sql security definer set search_path = '' as $$
  update public.training_bids
     set contract_due_at = contract_due_at + (now() - contract_paused_at), contract_paused_at = null
   where id = p_bid and contract_paused_at is not null;
$$;

-- ─── Matching (40 % specialty · 25 % rating · 20 % availability · 15 % location) ────────────────────────
create or replace function public.training_request_match(p_request uuid, p_trainer uuid)
returns table (score integer, score_specialty integer, score_rating integer, score_availability integer,
               score_location integer, conflict_kind text, conflict_title text, conflict_from date, conflict_to date)
language plpgsql stable security definer set search_path = '' as $$
declare
  r public.training_requests;
  specs text[];
  t_city text;
  avg_rating numeric;
  w_from timestamptz;
  w_to timestamptz;
  s_spec int; s_rate int; s_avail int; s_loc int;
  c_kind text; c_title text; c_from date; c_to date;
begin
  if p_trainer is distinct from auth.uid() and not public.is_org_member(public.request_org(p_request)) then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  select * into r from public.training_requests where id = p_request;
  if not found then return; end if;
  select coalesce(tp.specialties, '{}') into specs from public.trainer_profiles tp where tp.user_id = p_trainer;
  select p.city into t_city from public.profiles p where p.id = p_trainer;
  select sum(k.rating_avg * k.rating_count) / nullif(sum(k.rating_count), 0) into avg_rating
    from public.courses k where k.trainer_id = p_trainer and k.rating_count > 0;

  w_from := (r.starts_on::timestamp at time zone 'Asia/Riyadh');
  w_to := ((r.ends_on + 1)::timestamp at time zone 'Asia/Riyadh');

  -- First conflict: a scheduled course session, an own appointment, or another accepted bid.
  select 'course', k.title, min((s.starts_at at time zone 'Asia/Riyadh')::date), max((s.starts_at at time zone 'Asia/Riyadh')::date)
    into c_kind, c_title, c_from, c_to
    from public.course_sessions s join public.courses k on k.id = s.course_id
   where k.trainer_id = p_trainer and k.status in ('open', 'in_progress') and s.status <> 'cancelled'
     and s.starts_at < w_to and s.ends_at > w_from
   group by k.id, k.title order by 3 limit 1;
  if c_kind is null then
    select 'event', ev.title, (ev.starts_at at time zone 'Asia/Riyadh')::date, (ev.ends_at at time zone 'Asia/Riyadh')::date
      into c_kind, c_title, c_from, c_to
      from public.trainer_calendar_events ev
     where ev.trainer_id = p_trainer and public.trainer_event_overlaps(ev.starts_at, ev.ends_at, ev.recurrence, w_from, w_to)
     order by ev.starts_at limit 1;
  end if;
  if c_kind is null then
    select 'bid', q.title, (public.bid_terms(b) ->> 'starts_on')::date, (public.bid_terms(b) ->> 'ends_on')::date
      into c_kind, c_title, c_from, c_to
      from public.training_bids b join public.training_requests q on q.id = b.request_id
     where b.trainer_id = p_trainer and b.status = 'accepted' and b.request_id <> p_request
       and (public.bid_terms(b) ->> 'starts_on')::date <= r.ends_on and (public.bid_terms(b) ->> 'ends_on')::date >= r.starts_on
     limit 1;
  end if;

  s_spec := case when r.field = any (specs) then 40 else 0 end;
  s_rate := coalesce(round(avg_rating / 5 * 25)::int, 0);
  s_avail := case when c_kind is null then 20 else 0 end;
  s_loc := case when r.mode = 'live_remote' then 15
                when t_city is not null and r.city is not null and btrim(t_city) = btrim(r.city) then 15 else 0 end;
  return query select s_spec + s_rate + s_avail + s_loc, s_spec, s_rate, s_avail, s_loc, c_kind, c_title, c_from, c_to;
end $$;

-- ─── Read model: opportunities for the signed-in trainer (TRR-BID-01/02, dashboard «فرص تناسبك») ────────
create or replace function public.trainer_opportunities(p_request uuid default null)
returns table (
  id uuid, organization_id uuid, organization_name text, title text, summary text, field text, audience text,
  seats integer, mode public.course_mode, city text, venue text, venue_area text, starts_on date, ends_on date,
  days integer, hours_per_day numeric, budget_min numeric, budget_max numeric, payment_terms text,
  requirements text[], bids_close_at timestamptz, status text, published_at timestamptz,
  score integer, score_specialty integer, score_rating integer, score_availability integer, score_location integer,
  conflict_kind text, conflict_title text, conflict_from date, conflict_to date,
  my_bid_id uuid, my_bid_status text, other_bids integer)
language plpgsql stable security definer set search_path = '' as $$
declare u uuid := public.require_user();
begin
  if not exists (select 1 from public.user_workspaces w where w.user_id = u and w.kind = 'trainer') then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  return query
  select r.id, r.organization_id, o.name, r.title, r.summary, r.field, r.audience, r.seats, r.mode, r.city, r.venue,
         r.venue_area, r.starts_on, r.ends_on, r.days, r.hours_per_day, r.budget_min, r.budget_max, r.payment_terms,
         r.requirements, r.bids_close_at, r.status, r.published_at,
         m.score, m.score_specialty, m.score_rating, m.score_availability, m.score_location,
         m.conflict_kind, m.conflict_title, m.conflict_from, m.conflict_to,
         mb.id, mb.status,
         (select count(*)::int from public.training_bids ob
           where ob.request_id = r.id and ob.trainer_id <> u and ob.status not in ('draft', 'withdrawn'))
  from public.training_requests r
  join public.organizations o on o.id = r.organization_id
  left join public.training_bids mb on mb.request_id = r.id and mb.trainer_id = u
  cross join lateral public.training_request_match(r.id, u) m
  where (p_request is null and r.status = 'open' and r.bids_close_at > now())
     or (p_request is not null and r.id = p_request and (r.status = 'open' or mb.id is not null));
end $$;

-- ─── Read model: the signed-in trainer's bids (TRR-BID-03/04/05) ───────────────────────────────────────
create or replace function public.trainer_bids(p_bid uuid default null)
returns table (
  id uuid, reference text, request_id uuid, request_title text, organization_id uuid, organization_name text,
  status text, program_id uuid, program_title text, price numeric, hours numeric, days integer,
  starts_on date, ends_on date, payment_terms text, message text, attachment_name text,
  submitted_at timestamptz, decided_at timestamptz, decision_reason text, decision_comment text,
  decision_notes jsonb, withdrawn_at timestamptz, withdraw_reason text, withdraw_note text,
  withdrawn_after_accept boolean, contract_due_at timestamptz, contract_paused_at timestamptz,
  contracted_at timestamptz, agreed_terms jsonb, effective_terms jsonb, budget_min numeric, budget_max numeric,
  request_days integer, request_starts_on date, request_ends_on date, bids_close_at timestamptz,
  request_status text, other_bids integer, negotiation_status text, updated_at timestamptz, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select b.id, b.reference, r.id, r.title, o.id, o.name, b.status, b.program_id, g.title, b.price, b.hours, b.days,
         b.starts_on, b.ends_on, b.payment_terms, b.message, b.attachment_name,
         b.submitted_at, b.decided_at, b.decision_reason, b.decision_comment, b.decision_notes,
         b.withdrawn_at, b.withdraw_reason, b.withdraw_note, b.withdrawn_after_accept,
         b.contract_due_at, b.contract_paused_at, b.contracted_at, b.agreed_terms, public.bid_terms(b),
         r.budget_min, r.budget_max, r.days, r.starts_on, r.ends_on, r.bids_close_at, r.status,
         (select count(*)::int from public.training_bids ob
           where ob.request_id = r.id and ob.id <> b.id and ob.status not in ('draft', 'withdrawn')),
         (select n.status from public.bid_negotiations n where n.bid_id = b.id order by n.created_at desc limit 1),
         b.updated_at, b.created_at
  from public.training_bids b
  join public.training_requests r on r.id = b.request_id
  join public.organizations o on o.id = r.organization_id
  left join public.programs g on g.id = b.program_id
  where b.trainer_id = public.require_user() and (p_bid is null or b.id = p_bid)
  order by b.updated_at desc;
$$;

-- Acceptance rate, platform average and declared rejection reasons (TRR-BID-03 / 04).
create or replace function public.trainer_bid_stats() returns jsonb
language sql stable security definer set search_path = '' as $$
  with mine as (
    select * from public.training_bids where trainer_id = public.require_user() and status <> 'draft'
  ), everyone as (
    select status from public.training_bids where status <> 'draft'
  )
  select jsonb_build_object(
    'total', (select count(*) from mine),
    'accepted', (select count(*) from mine where status = 'accepted' or (status = 'withdrawn' and withdrawn_after_accept)),
    'pending', (select count(*) from mine where status in ('submitted', 'shortlisted')),
    'rejected', (select count(*) from mine where status = 'rejected'),
    'platform_total', (select count(*) from everyone),
    'platform_accepted', (select count(*) from everyone where status = 'accepted'),
    'reasons', coalesce((select jsonb_object_agg(decision_reason, n) from (
        select decision_reason, count(*) as n from mine where status = 'rejected' and decision_reason is not null group by 1) x), '{}'::jsonb));
$$;

-- Negotiation history of one of the caller's bids (or of a bid on the caller's organization's request).
create or replace function public.bid_negotiation_history(p_bid uuid)
returns table (negotiation_id uuid, status text, round integer, draft_terms jsonb, draft_message text, respond_by timestamptz,
               outcome_at timestamptz, outcome_by text, outcome_reason text, agreed_terms jsonb, created_at timestamptz,
               rounds jsonb)
language sql stable security definer set search_path = '' as $$
  select n.id, n.status, n.round,
         case when b.trainer_id = auth.uid() then n.draft_terms else '{}'::jsonb end,
         case when b.trainer_id = auth.uid() then n.draft_message end,
         n.respond_by, n.outcome_at, n.outcome_by, n.outcome_reason, n.agreed_terms, n.created_at,
         coalesce((select jsonb_agg(to_jsonb(x) - 'negotiation_id' order by x.round) from public.bid_negotiation_rounds x
                    where x.negotiation_id = n.id), '[]'::jsonb)
  from public.bid_negotiations n join public.training_bids b on b.id = n.bid_id
  where n.bid_id = p_bid and public.can_see_bid(p_bid)
    and (b.trainer_id = auth.uid() or n.status <> 'draft')
  order by n.created_at;
$$;

-- ─── Trainer RPCs ───────────────────────────────────────────────────────────────────────────────────────
-- TRR-BID-02: save a draft or submit an offer on an open request.
create or replace function public.save_training_bid(
  p_request uuid, p_program uuid, p_price numeric, p_hours numeric, p_message text,
  p_attachment_path text, p_attachment_name text, p_commit boolean, p_submit boolean
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  u uuid := public.require_user();
  r public.training_requests;
  b public.training_bids;
  bid_id uuid;
begin
  if not exists (select 1 from public.user_workspaces w where w.user_id = u and w.kind = 'trainer') then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  select * into r from public.training_requests where id = p_request for update;
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
  if r.status <> 'open' or r.bids_close_at <= now() then raise exception 'request_closed' using errcode = 'P0001'; end if;
  if p_program is not null and not exists (
    select 1 from public.programs g where g.id = p_program and g.owner_id = u and g.status = 'published') then
    raise exception 'program_not_published' using errcode = 'P0001';
  end if;
  if p_attachment_path is not null and split_part(p_attachment_path, '/', 1) <> u::text then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  if (p_price is not null and (p_price <= 0 or p_price > 10000000)) or (p_hours is not null and (p_hours <= 0 or p_hours > 500))
     or char_length(coalesce(p_message, '')) > 4000 then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;
  if p_submit then
    if p_program is null or p_price is null or p_hours is null or char_length(trim(coalesce(p_message, ''))) < 20 then
      raise exception 'bid_incomplete' using errcode = 'P0001';
    end if;
    if not coalesce(p_commit, false) then raise exception 'commitment_required' using errcode = 'P0001'; end if;
  end if;

  select * into b from public.training_bids where request_id = p_request and trainer_id = u for update;
  if found and b.status <> 'draft' then raise exception 'bid_exists' using errcode = 'P0001'; end if;

  insert into public.training_bids (request_id, trainer_id, program_id, price, hours, message, attachment_path, attachment_name)
  values (p_request, u, p_program, p_price, p_hours, nullif(trim(coalesce(p_message, '')), ''), p_attachment_path, p_attachment_name)
  on conflict (request_id, trainer_id) do update
    set program_id = excluded.program_id, price = excluded.price, hours = excluded.hours, message = excluded.message,
        attachment_path = coalesce(excluded.attachment_path, public.training_bids.attachment_path),
        attachment_name = coalesce(excluded.attachment_name, public.training_bids.attachment_name)
  returning id into bid_id;

  if p_submit then
    update public.training_bids
       set status = 'submitted', submitted_at = now(), committed_at = now(),
           days = r.days, starts_on = r.starts_on, ends_on = r.ends_on, payment_terms = r.payment_terms
     where id = bid_id;
    perform public.notify(m.user_id, 'bid_received', 'عرض جديد على طلبك',
                          'وصل عرض تدريبي جديد على «' || r.title || '».', null)
      from public.organization_members m where m.organization_id = r.organization_id;
  end if;
  return bid_id;
end $$;

-- TRR-BID-03 «اسحب العرض» / TRR-BID-05 «اعتذر عن العرض» (after acceptance it is recorded as such).
create or replace function public.withdraw_training_bid(p_bid uuid, p_reason text, p_note text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare
  u uuid := public.require_user();
  b public.training_bids;
  r public.training_requests;
begin
  select * into b from public.training_bids where id = p_bid and trainer_id = u for update;
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
  if b.status not in ('submitted', 'shortlisted', 'accepted') or b.contracted_at is not null then
    raise exception 'bid_not_withdrawable' using errcode = 'P0001';
  end if;
  if p_reason is null or p_reason not in ('schedule_conflict', 'price_change', 'not_available', 'other') then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;
  select * into r from public.training_requests where id = b.request_id for update;
  update public.training_bids
     set status = 'withdrawn', withdrawn_at = now(), withdraw_reason = p_reason,
         withdraw_note = nullif(trim(coalesce(p_note, '')), ''), withdrawn_after_accept = (b.status = 'accepted'),
         contract_paused_at = null
   where id = p_bid;
  update public.bid_negotiations set status = 'cancelled', outcome_at = now(), outcome_by = 'trainer', respond_by = null
   where bid_id = p_bid and status in ('draft', 'awaiting_org', 'countered');
  if b.status = 'accepted' and r.status = 'awarded' then
    update public.training_requests set status = case when bids_close_at > now() then 'open' else 'closed' end where id = r.id;
  end if;
  perform public.notify(m.user_id, 'bid_withdrawn', 'سحب مدرب عرضه',
                        case when b.status = 'accepted' then 'اعتذر المدرب عن عرضه المقبول على «' else 'سحب مدرب عرضه على «' end
                        || r.title || '».', null)
    from public.organization_members m where m.organization_id = r.organization_id;
end $$;

-- TRR-BID-05 «ابدأ التفاوض»: opens a draft negotiation on an accepted, not yet contracted bid.
create or replace function public.open_bid_negotiation(p_bid uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  u uuid := public.require_user();
  b public.training_bids;
  nid uuid;
begin
  select * into b from public.training_bids where id = p_bid and trainer_id = u for update;
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
  if b.status <> 'accepted' or b.contracted_at is not null then raise exception 'bid_not_negotiable' using errcode = 'P0001'; end if;
  if b.contract_paused_at is null and b.contract_due_at <= now() then raise exception 'contract_window_over' using errcode = 'P0001'; end if;
  select id into nid from public.bid_negotiations where bid_id = p_bid and status in ('draft', 'awaiting_org', 'countered');
  if nid is not null then return nid; end if;
  if exists (select 1 from public.bid_negotiations where bid_id = p_bid and status not in ('cancelled', 'withdrawn')) then
    raise exception 'negotiation_used' using errcode = 'P0001';
  end if;
  insert into public.bid_negotiations (bid_id) values (p_bid) returning id into nid;
  return nid;
end $$;

-- Saves the trainer's proposal (draft), or sends it (round 1, or the final round 2 after a counter-proposal).
create or replace function public.save_bid_negotiation(p_negotiation uuid, p_terms jsonb, p_message text, p_send boolean)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  u uuid := public.require_user();
  n public.bid_negotiations;
  b public.training_bids;
  r public.training_requests;
  base jsonb;
  next_round int;
begin
  select * into n from public.bid_negotiations where id = p_negotiation for update;
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
  select * into b from public.training_bids where id = n.bid_id and trainer_id = u for update;
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
  if n.status not in ('draft', 'countered') or b.status <> 'accepted' then raise exception 'negotiation_closed' using errcode = 'P0001'; end if;
  if n.status = 'countered' and n.round >= 2 then raise exception 'negotiation_used' using errcode = 'P0001'; end if;
  if n.status = 'countered' and n.respond_by <= now() then raise exception 'negotiation_expired' using errcode = 'P0001'; end if;
  if p_terms is null or jsonb_typeof(p_terms) <> 'object' or char_length(coalesce(p_message, '')) > 2000 then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;
  base := public.bid_terms(b);

  if not coalesce(p_send, false) then
    if p_terms <> '{}'::jsonb then perform public.validate_bid_terms(base, p_terms, false); end if;
    update public.bid_negotiations set draft_terms = p_terms, draft_message = nullif(trim(coalesce(p_message, '')), '')
     where id = n.id;
    return;
  end if;

  perform public.validate_bid_terms(base, p_terms, true);
  next_round := case when n.status = 'countered' then 2 else 1 end;
  insert into public.bid_negotiation_rounds (negotiation_id, round, base_terms, proposal, message, respond_by)
  values (n.id, next_round, base, p_terms, nullif(trim(coalesce(p_message, '')), ''), now() + interval '72 hours');
  update public.bid_negotiations
     set status = 'awaiting_org', round = next_round, draft_terms = '{}'::jsonb, draft_message = null,
         respond_by = now() + interval '72 hours'
   where id = n.id;
  update public.training_bids set contract_paused_at = coalesce(contract_paused_at, now()) where id = b.id;
  select * into r from public.training_requests where id = b.request_id;
  perform public.notify(m.user_id, 'action_required', 'اقتراح تفاوض من مدرب',
                        'أرسل المدرب اقتراحًا لتعديل شروط «' || r.title || '». لديكم ٧٢ ساعة للرد.', null)
    from public.organization_members m where m.organization_id = r.organization_id;
end $$;

-- «إلغاء التفاوض» (draft only — no trace for the organization).
create or replace function public.cancel_bid_negotiation(p_negotiation uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare u uuid := public.require_user(); n public.bid_negotiations;
begin
  select n0.* into n from public.bid_negotiations n0 join public.training_bids b on b.id = n0.bid_id
   where n0.id = p_negotiation and b.trainer_id = u for update of n0;
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
  if n.status <> 'draft' then raise exception 'negotiation_closed' using errcode = 'P0001'; end if;
  update public.bid_negotiations set status = 'cancelled', outcome_at = now(), outcome_by = 'trainer', draft_terms = '{}'::jsonb
   where id = n.id;
end $$;

-- «اسحب الاقتراح»: the sent proposal is withdrawn, original terms stay, the contract clock resumes.
create or replace function public.withdraw_bid_negotiation(p_negotiation uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare u uuid := public.require_user(); n public.bid_negotiations; b public.training_bids; r public.training_requests;
begin
  select * into n from public.bid_negotiations where id = p_negotiation for update;
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
  select * into b from public.training_bids where id = n.bid_id and trainer_id = u;
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
  if n.status <> 'awaiting_org' then raise exception 'negotiation_closed' using errcode = 'P0001'; end if;
  update public.bid_negotiation_rounds set response = 'withdrawn', responded_at = now(), responded_by = u
   where negotiation_id = n.id and round = n.round and response is null;
  update public.bid_negotiations set status = 'withdrawn', outcome_at = now(), outcome_by = 'trainer', respond_by = null where id = n.id;
  perform public.resume_bid_contract_clock(b.id);
  select * into r from public.training_requests where id = b.request_id;
  perform public.notify(m.user_id, 'bid_negotiation', 'سحب المدرب اقتراح التفاوض',
                        'سحب المدرب اقتراحه على «' || r.title || '». الشروط الأصلية سارية.', null)
    from public.organization_members m where m.organization_id = r.organization_id;
end $$;

-- «اقبل الشروط المقابلة» / «ارفض وعُد للشروط الأصلية».
create or replace function public.respond_bid_counter(p_negotiation uuid, p_accept boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare
  u uuid := public.require_user();
  n public.bid_negotiations;
  b public.training_bids;
  r public.training_requests;
  rd public.bid_negotiation_rounds;
  agreed jsonb;
begin
  select * into n from public.bid_negotiations where id = p_negotiation for update;
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
  select * into b from public.training_bids where id = n.bid_id and trainer_id = u for update;
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
  if n.status <> 'countered' then raise exception 'negotiation_closed' using errcode = 'P0001'; end if;
  if n.respond_by <= now() then raise exception 'negotiation_expired' using errcode = 'P0001'; end if;
  select * into rd from public.bid_negotiation_rounds where negotiation_id = n.id and round = n.round;
  select * into r from public.training_requests where id = b.request_id;
  if coalesce(p_accept, false) then
    agreed := public.apply_bid_terms(public.apply_bid_terms(rd.base_terms, rd.proposal), coalesce(rd.counter, '{}'::jsonb));
    update public.bid_negotiations set status = 'agreed', outcome_at = now(), outcome_by = 'trainer', respond_by = null,
           agreed_terms = agreed where id = n.id;
    update public.training_bids set agreed_terms = agreed where id = b.id;
    perform public.notify(m.user_id, 'bid_negotiation', 'قبل المدرب شروطكم المقابلة',
                          'اتُّفق على شروط «' || r.title || '». يتبقى التعاقد.', null)
      from public.organization_members m where m.organization_id = r.organization_id;
  else
    update public.bid_negotiations set status = 'declined', outcome_at = now(), outcome_by = 'trainer', respond_by = null
     where id = n.id;
    perform public.notify(m.user_id, 'bid_negotiation', 'رفض المدرب الشروط المقابلة',
                          'عاد عرض «' || r.title || '» لشروطه الأصلية.', null)
      from public.organization_members m where m.organization_id = r.organization_id;
  end if;
  perform public.resume_bid_contract_clock(b.id);
end $$;

-- «راسل الجهة»: opens (or reuses) the bid's conversation with the organization's members.
create or replace function public.open_bid_conversation(p_bid uuid, p_body text default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare u uuid := public.require_user(); b public.training_bids; r public.training_requests; cid uuid;
begin
  select * into b from public.training_bids where id = p_bid and trainer_id = u and status <> 'draft';
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
  select * into r from public.training_requests where id = b.request_id;
  select c.id into cid from public.conversations c
    join public.conversation_participants p on p.conversation_id = c.id and p.user_id = u
   where c.bid_id = p_bid order by c.created_at limit 1;
  if cid is null then
    insert into public.conversations (subject, bid_id) values (left(r.title, 200), p_bid) returning id into cid;
    insert into public.conversation_participants (conversation_id, user_id, last_read_at) values (cid, u, now());
    insert into public.conversation_participants (conversation_id, user_id)
    select cid, m.user_id from public.organization_members m where m.organization_id = r.organization_id and m.user_id <> u
    on conflict do nothing;
  end if;
  if char_length(trim(coalesce(p_body, ''))) > 0 then
    insert into public.messages (conversation_id, sender_id, body) values (cid, u, left(trim(p_body), 4000));
  end if;
  return cid;
end $$;

-- ─── Organization RPCs (future requester workspace; any member of the requesting organization) ─────────
create or replace function public.create_training_request(p_org uuid, p jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare u uuid := public.require_user(); rid uuid;
begin
  if not public.is_org_member(p_org) or not exists (select 1 from public.organizations o where o.id = p_org and o.kind = 'requester') then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  insert into public.training_requests (
    organization_id, created_by, title, summary, field, audience, seats, mode, city, venue, venue_area, starts_on, ends_on,
    days, hours_per_day, budget_min, budget_max, payment_terms, requirements, bids_close_at, status, published_at)
  values (
    p_org, u, p ->> 'title', coalesce(p ->> 'summary', ''), p ->> 'field', p ->> 'audience', (p ->> 'seats')::int,
    (p ->> 'mode')::public.course_mode, p ->> 'city', p ->> 'venue', p ->> 'venue_area', (p ->> 'starts_on')::date,
    (p ->> 'ends_on')::date, (p ->> 'days')::int, (p ->> 'hours_per_day')::numeric, (p ->> 'budget_min')::numeric,
    (p ->> 'budget_max')::numeric, coalesce(p ->> 'payment_terms', 'single_after'),
    coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(p -> 'requirements', '[]'::jsonb)) x), '{}'),
    (p ->> 'bids_close_at')::timestamptz, case when coalesce((p ->> 'publish')::boolean, true) then 'open' else 'draft' end,
    case when coalesce((p ->> 'publish')::boolean, true) then now() end)
  returning id into rid;
  return rid;
end $$;

create or replace function public.set_training_request_status(p_request uuid, p_status text) returns void
language plpgsql security definer set search_path = '' as $$
declare u uuid := public.require_user(); r public.training_requests;
begin
  select * into r from public.training_requests where id = p_request for update;
  if not found or not public.is_org_member(r.organization_id) then raise exception 'not_found' using errcode = 'P0001'; end if;
  if p_status not in ('open', 'closed', 'cancelled') or r.status in ('awarded', 'cancelled') then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;
  update public.training_requests set status = p_status, published_at = coalesce(published_at, case when p_status = 'open' then now() end)
   where id = p_request;
  if p_status = 'cancelled' then
    update public.training_bids set status = 'rejected', decided_at = now(), decided_by = u, decision_reason = 'scope'
     where request_id = p_request and status in ('submitted', 'shortlisted');
  end if;
end $$;

create or replace function public.shortlist_training_bid(p_bid uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare u uuid := public.require_user(); b public.training_bids;
begin
  select * into b from public.training_bids where id = p_bid for update;
  if not found or not public.is_org_member(public.request_org(b.request_id)) then raise exception 'not_found' using errcode = 'P0001'; end if;
  if b.status <> 'submitted' then raise exception 'bid_not_pending' using errcode = 'P0001'; end if;
  update public.training_bids set status = 'shortlisted' where id = p_bid;
end $$;

-- Accept or reject a bid with a categorised reason, a comment and optional feedback lines (TRR-BID-04).
create or replace function public.decide_training_bid(
  p_bid uuid, p_decision text, p_reason text, p_comment text default null, p_notes jsonb default '[]'::jsonb
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  u uuid := public.require_user();
  b public.training_bids;
  r public.training_requests;
  other record;
begin
  select * into b from public.training_bids where id = p_bid for update;
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
  select * into r from public.training_requests where id = b.request_id for update;
  if not public.is_org_member(r.organization_id) then raise exception 'not_found' using errcode = 'P0001'; end if;
  if b.status not in ('submitted', 'shortlisted') then raise exception 'bid_not_pending' using errcode = 'P0001'; end if;
  if p_decision not in ('accepted', 'rejected') or p_reason is null
     or jsonb_typeof(coalesce(p_notes, '[]'::jsonb)) <> 'array' or char_length(coalesce(p_comment, '')) > 2000 then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;
  if p_decision = 'accepted' and (r.status not in ('open', 'closed') or exists (
      select 1 from public.training_bids x where x.request_id = r.id and x.status = 'accepted')) then
    raise exception 'request_awarded' using errcode = 'P0001';
  end if;

  update public.training_bids
     set status = p_decision, decided_at = now(), decided_by = u, decision_reason = p_reason,
         decision_comment = nullif(trim(coalesce(p_comment, '')), ''), decision_notes = coalesce(p_notes, '[]'::jsonb),
         contract_due_at = case when p_decision = 'accepted' then now() + interval '7 days' end
   where id = p_bid;

  if p_decision = 'accepted' then
    update public.training_requests set status = 'awarded' where id = r.id;
    perform public.notify(b.trainer_id, 'action_required', 'قبلت الجهة عرضك',
                          'قبلت ' || (select name from public.organizations where id = r.organization_id) || ' عرضك على «' || r.title
                          || '». أكمل التعاقد خلال ٧ أيام.', '/trainer/bids/' || b.id || '/decision');
    -- The other pending offers on the same request are closed with the declared reason «اختارت الجهة مدربًا آخر».
    for other in select id, trainer_id from public.training_bids
                  where request_id = r.id and id <> p_bid and status in ('submitted', 'shortlisted') loop
      update public.training_bids set status = 'rejected', decided_at = now(), decided_by = u, decision_reason = 'other_trainer'
       where id = other.id;
      perform public.notify(other.trainer_id, 'bid_decided', 'لم يُقبل عرضك',
                            'اختارت الجهة مدربًا آخر لطلب «' || r.title || '».', '/trainer/bids/' || other.id || '/decision');
    end loop;
  else
    perform public.notify(b.trainer_id, 'bid_decided', 'لم يُقبل عرضك',
                          'صدر قرار الجهة على عرضك لطلب «' || r.title || '». اطّلع على السبب لتحسين عرضك القادم.',
                          '/trainer/bids/' || b.id || '/decision');
  end if;
end $$;

-- Organization response to the trainer's proposal: accept, counter (round 1 only) or reject.
-- p_counter: {"price":{"value":5600,"reason":"…"},"dates":{"value":{…},"reason":"…"}} — terms left out are accepted as proposed.
create or replace function public.respond_bid_negotiation(p_negotiation uuid, p_response text, p_counter jsonb default null, p_reason text default null)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  u uuid := public.require_user();
  n public.bid_negotiations;
  b public.training_bids;
  r public.training_requests;
  rd public.bid_negotiation_rounds;
  agreed jsonb;
  k text;
begin
  select * into n from public.bid_negotiations where id = p_negotiation for update;
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
  select * into b from public.training_bids where id = n.bid_id for update;
  select * into r from public.training_requests where id = b.request_id;
  if not public.is_org_member(r.organization_id) then raise exception 'not_found' using errcode = 'P0001'; end if;
  if n.status <> 'awaiting_org' then raise exception 'negotiation_closed' using errcode = 'P0001'; end if;
  if n.respond_by <= now() then raise exception 'negotiation_expired' using errcode = 'P0001'; end if;
  if p_response not in ('accepted', 'countered', 'rejected') or char_length(coalesce(p_reason, '')) > 1000 then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;
  select * into rd from public.bid_negotiation_rounds where negotiation_id = n.id and round = n.round for update;

  if p_response = 'accepted' then
    agreed := public.apply_bid_terms(rd.base_terms, rd.proposal);
    update public.bid_negotiation_rounds set response = 'accepted', responded_at = now(), responded_by = u,
           response_reason = nullif(trim(coalesce(p_reason, '')), '') where id = rd.id;
    update public.bid_negotiations set status = 'agreed', outcome_at = now(), outcome_by = 'org', respond_by = null,
           agreed_terms = agreed where id = n.id;
    update public.training_bids set agreed_terms = agreed where id = b.id;
    perform public.resume_bid_contract_clock(b.id);
    perform public.notify(b.trainer_id, 'action_required', 'قبلت الجهة اقتراحك',
                          'وافقت الجهة على تعديل شروط «' || r.title || '». أكمل التعاقد بالشروط الجديدة.',
                          '/trainer/bids/' || b.id || '/negotiation');
  elsif p_response = 'countered' then
    if n.round >= 2 then raise exception 'negotiation_final_round' using errcode = 'P0001'; end if;
    perform public.validate_bid_terms(public.apply_bid_terms(rd.base_terms, rd.proposal), p_counter, true);
    for k in select jsonb_object_keys(p_counter) loop
      if not rd.proposal ? k then raise exception 'term_not_proposed' using errcode = 'P0001'; end if;
    end loop;
    update public.bid_negotiation_rounds set response = 'countered', counter = p_counter, responded_at = now(), responded_by = u,
           response_reason = nullif(trim(coalesce(p_reason, '')), '') where id = rd.id;
    update public.bid_negotiations set status = 'countered', respond_by = now() + interval '72 hours' where id = n.id;
    perform public.notify(b.trainer_id, 'action_required', 'اقتراح مقابل من الجهة',
                          'ردّت الجهة على اقتراحك لـ«' || r.title || '» بشروط مقابلة. لديك ٧٢ ساعة للرد.',
                          '/trainer/bids/' || b.id || '/negotiation');
  else
    update public.bid_negotiation_rounds set response = 'rejected', responded_at = now(), responded_by = u,
           response_reason = nullif(trim(coalesce(p_reason, '')), '') where id = rd.id;
    update public.bid_negotiations set status = 'rejected', outcome_at = now(), outcome_by = 'org', respond_by = null,
           outcome_reason = nullif(trim(coalesce(p_reason, '')), '') where id = n.id;
    perform public.resume_bid_contract_clock(b.id);
    perform public.notify(b.trainer_id, 'bid_negotiation', 'لم تقبل الجهة اقتراحك',
                          'الشروط الأصلية لـ«' || r.title || '» ما زالت سارية والعرض قائم.',
                          '/trainer/bids/' || b.id || '/negotiation');
  end if;
end $$;

-- ─── Jobs: negotiation deadlines, contract deadlines, closing requests ─────────────────────────────────
create or replace function public.expire_training_bids() returns void
language plpgsql security definer set search_path = '' as $$
declare x record;
begin
  -- 72-hour response windows.
  for x in select n.id, n.status, n.round, n.bid_id, b.trainer_id, r.title, r.organization_id
             from public.bid_negotiations n join public.training_bids b on b.id = n.bid_id
             join public.training_requests r on r.id = b.request_id
            where n.status in ('awaiting_org', 'countered') and n.respond_by <= now() for update of n loop
    if x.status = 'awaiting_org' then
      update public.bid_negotiation_rounds set response = 'expired', responded_at = now()
       where negotiation_id = x.id and round = x.round and response is null;
    end if;
    update public.bid_negotiations set status = 'expired', outcome_at = now(), outcome_by = 'system', respond_by = null where id = x.id;
    perform public.resume_bid_contract_clock(x.bid_id);
    perform public.notify(x.trainer_id, 'bid_negotiation', 'انقضت مهلة الرد على التفاوض',
                          'عادت الشروط الأصلية لـ«' || x.title || '» تلقائيًا واستؤنفت مهلة التعاقد.',
                          '/trainer/bids/' || x.bid_id || '/negotiation');
  end loop;
  -- Accepted but not contracted within the window.
  for x in select b.id, b.trainer_id, b.request_id, r.title, r.bids_close_at
             from public.training_bids b join public.training_requests r on r.id = b.request_id
            where b.status = 'accepted' and b.contracted_at is null and b.contract_paused_at is null
              and b.contract_due_at <= now() for update of b loop
    update public.training_bids set status = 'expired' where id = x.id;
    update public.training_requests set status = case when x.bids_close_at > now() then 'open' else 'closed' end
     where id = x.request_id and status = 'awarded';
    perform public.notify(x.trainer_id, 'bid_decided', 'انتهت مهلة التعاقد',
                          'لم يكتمل التعاقد على «' || x.title || '» خلال المهلة.', '/trainer/bids');
  end loop;
  update public.training_requests set status = 'closed' where status = 'open' and bids_close_at <= now();
end $$;

select cron.schedule('expire-training-bids', '*/5 * * * *', $$select public.expire_training_bids()$$);

-- ─── RLS ─────────────────────────────────────────────────────────────────────────────────────────────────
alter table public.training_requests enable row level security;
alter table public.training_bids enable row level security;
alter table public.bid_negotiations enable row level security;
alter table public.bid_negotiation_rounds enable row level security;

-- Trainers see open requests; organization members see their own; a trainer keeps seeing requests they bid on.
create policy training_requests_read on public.training_requests for select to authenticated
  using (public.is_org_member(organization_id)
         or (status = 'open' and (select public.has_workspace('trainer')))
         or public.has_bid_on_request(id));

-- A trainer sees only their own bids; organization members see submitted bids on their requests.
create policy training_bids_read on public.training_bids for select to authenticated
  using (trainer_id = (select auth.uid())
         or (status <> 'draft' and public.is_org_member(public.request_org(request_id))));

create policy bid_negotiations_read on public.bid_negotiations for select to authenticated
  using (public.can_see_bid(bid_id)
         and (status <> 'draft' or exists (select 1 from public.training_bids b where b.id = bid_id and b.trainer_id = (select auth.uid()))));

create policy bid_negotiation_rounds_read on public.bid_negotiation_rounds for select to authenticated
  using (exists (select 1 from public.bid_negotiations n where n.id = negotiation_id and public.can_see_bid(n.bid_id)));
-- All writes go through the RPCs above.

-- ─── Storage: private offer attachments (workshop plans, PDF) ───────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('bid-attachments', 'bid-attachments', false, 10485760, array['application/pdf'])
on conflict (id) do nothing;

create policy "bid attachments insert own" on storage.objects for insert to authenticated
  with check (bucket_id = 'bid-attachments' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "bid attachments delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'bid-attachments' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "bid attachments read" on storage.objects for select to authenticated
  using (bucket_id = 'bid-attachments' and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or exists (select 1 from public.training_bids b join public.training_requests r on r.id = b.request_id
               where b.attachment_path = storage.objects.name and b.status <> 'draft' and public.is_org_member(r.organization_id))));

-- ─── Function privileges ───────────────────────────────────────────────────────────────────────────────
revoke all on function public.request_org(uuid) from public, anon;
revoke all on function public.has_bid_on_request(uuid) from public, anon;
revoke all on function public.can_see_bid(uuid) from public, anon;
revoke all on function public.bid_terms(public.training_bids) from public, anon;
revoke all on function public.apply_bid_terms(jsonb, jsonb) from public, anon;
revoke all on function public.validate_bid_terms(jsonb, jsonb, boolean) from public, anon;
revoke all on function public.resume_bid_contract_clock(uuid) from public, anon, authenticated;
revoke all on function public.training_request_match(uuid, uuid) from public, anon;
revoke all on function public.trainer_opportunities(uuid) from public, anon;
revoke all on function public.trainer_bids(uuid) from public, anon;
revoke all on function public.trainer_bid_stats() from public, anon;
revoke all on function public.bid_negotiation_history(uuid) from public, anon;
revoke all on function public.save_training_bid(uuid, uuid, numeric, numeric, text, text, text, boolean, boolean) from public, anon;
revoke all on function public.withdraw_training_bid(uuid, text, text) from public, anon;
revoke all on function public.open_bid_negotiation(uuid) from public, anon;
revoke all on function public.save_bid_negotiation(uuid, jsonb, text, boolean) from public, anon;
revoke all on function public.cancel_bid_negotiation(uuid) from public, anon;
revoke all on function public.withdraw_bid_negotiation(uuid) from public, anon;
revoke all on function public.respond_bid_counter(uuid, boolean) from public, anon;
revoke all on function public.open_bid_conversation(uuid, text) from public, anon;
revoke all on function public.create_training_request(uuid, jsonb) from public, anon;
revoke all on function public.set_training_request_status(uuid, text) from public, anon;
revoke all on function public.shortlist_training_bid(uuid) from public, anon;
revoke all on function public.decide_training_bid(uuid, text, text, text, jsonb) from public, anon;
revoke all on function public.respond_bid_negotiation(uuid, text, jsonb, text) from public, anon;
revoke all on function public.expire_training_bids() from public, anon, authenticated;

grant execute on function
  public.request_org(uuid),
  public.has_bid_on_request(uuid),
  public.can_see_bid(uuid),
  public.bid_terms(public.training_bids),
  public.apply_bid_terms(jsonb, jsonb),
  public.validate_bid_terms(jsonb, jsonb, boolean),
  public.training_request_match(uuid, uuid),
  public.trainer_opportunities(uuid),
  public.trainer_bids(uuid),
  public.trainer_bid_stats(),
  public.bid_negotiation_history(uuid),
  public.save_training_bid(uuid, uuid, numeric, numeric, text, text, text, boolean, boolean),
  public.withdraw_training_bid(uuid, text, text),
  public.open_bid_negotiation(uuid),
  public.save_bid_negotiation(uuid, jsonb, text, boolean),
  public.cancel_bid_negotiation(uuid),
  public.withdraw_bid_negotiation(uuid),
  public.respond_bid_counter(uuid, boolean),
  public.open_bid_conversation(uuid, text),
  public.create_training_request(uuid, jsonb),
  public.set_training_request_status(uuid, text),
  public.shortlist_training_bid(uuid),
  public.decide_training_bid(uuid, text, text, text, jsonb),
  public.respond_bid_negotiation(uuid, text, jsonb, text)
to authenticated;
