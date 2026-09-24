-- TRR-BID-01: the conflict row names what the trainer has on those days — a platform course, an outside training
-- («external», shown as a course too), a personal appointment or leave — so conflict_kind now carries the calendar
-- event kind instead of the generic 'event'.
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
    select ev.kind, ev.title, (ev.starts_at at time zone 'Asia/Riyadh')::date, (ev.ends_at at time zone 'Asia/Riyadh')::date
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
