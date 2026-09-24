-- TRR-CAL-01 / TRR-CAL-02: live conflict check, edit/move of the trainer's own appointments, and
-- recurrence-aware busy days (what organizations see as «غير متاح»).

-- Does [p_starts, p_ends) overlap an occurrence of a (possibly recurring) event? Weekly/biweekly/monthly
-- occurrences are checked up to two years ahead of the first one.
create or replace function public.trainer_event_overlaps(
  ev_starts timestamptz, ev_ends timestamptz, ev_recurrence text, p_starts timestamptz, p_ends timestamptz
) returns boolean
language sql immutable set search_path = '' as $$
  select case ev_recurrence
    when 'none' then ev_starts < p_ends and ev_ends > p_starts
    else exists (
      select 1 from generate_series(0, case ev_recurrence when 'monthly' then 24 when 'biweekly' then 53 else 105 end) k
      where ev_starts + case ev_recurrence when 'monthly' then make_interval(months => k)
                                           when 'biweekly' then make_interval(weeks => 2 * k)
                                           else make_interval(weeks => k) end < p_ends
        and ev_ends + case ev_recurrence when 'monthly' then make_interval(months => k)
                                         when 'biweekly' then make_interval(weeks => 2 * k)
                                         else make_interval(weeks => k) end > p_starts)
  end;
$$;

-- Live check for the «لا تعارض» row: the signed-in trainer's sessions and own appointments overlapping a range.
create or replace function public.trainer_calendar_conflicts(p_starts timestamptz, p_ends timestamptz, p_exclude uuid default null)
returns table (source text, title text, starts_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select 'session', k.title, s.starts_at
  from public.course_sessions s join public.courses k on k.id = s.course_id
  where k.trainer_id = public.require_user() and k.status in ('open', 'in_progress') and s.status <> 'cancelled'
    and s.starts_at < p_ends and s.ends_at > p_starts
  union all
  select 'event', ev.title, ev.starts_at
  from public.trainer_calendar_events ev
  where ev.trainer_id = public.require_user() and ev.id is distinct from p_exclude
    and public.trainer_event_overlaps(ev.starts_at, ev.ends_at, ev.recurrence, p_starts, p_ends)
  order by 3
  limit 5;
$$;

-- Edit or move («تعديل سريع») one of the trainer's own appointments, with the same rules as add_trainer_event().
create or replace function public.update_trainer_event(
  p_id uuid, p_kind text, p_title text, p_starts timestamptz, p_ends timestamptz, p_all_day boolean, p_recurrence text
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  u uuid := public.require_user();
begin
  if not exists (select 1 from public.trainer_calendar_events ev where ev.id = p_id and ev.trainer_id = u) then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  if p_kind not in ('personal', 'leave', 'external') or p_recurrence not in ('none', 'weekly', 'biweekly', 'monthly')
     or p_title is null or char_length(trim(p_title)) not between 2 and 120 then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;
  if p_starts is null or p_ends is null or p_ends <= p_starts then
    raise exception 'invalid_time_range' using errcode = 'P0001';
  end if;
  if p_ends - p_starts > interval '60 days' then
    raise exception 'event_too_long' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.course_sessions s join public.courses k on k.id = s.course_id
             where k.trainer_id = u and k.status in ('open', 'in_progress') and s.status <> 'cancelled'
               and s.starts_at < p_ends and s.ends_at > p_starts) then
    raise exception 'calendar_conflict' using errcode = 'P0001';
  end if;
  update public.trainer_calendar_events
     set kind = p_kind, title = trim(p_title), starts_at = p_starts, ends_at = p_ends,
         all_day = coalesce(p_all_day, false), recurrence = p_recurrence
   where id = p_id and trainer_id = u;
end $$;

-- Busy days now include every occurrence of recurring appointments.
create or replace function public.trainer_busy_days(p_trainer uuid, p_from date, p_days integer default 7)
returns table (day date, busy boolean)
language sql stable security definer set search_path = '' as $$
  select d::date,
         exists (select 1 from public.trainer_calendar_events ev
                 where ev.trainer_id = p_trainer
                   and public.trainer_event_overlaps(ev.starts_at, ev.ends_at, ev.recurrence,
                         (d::date::timestamp at time zone 'Asia/Riyadh'),
                         ((d::date + 1)::timestamp at time zone 'Asia/Riyadh')))
      or exists (select 1 from public.course_sessions s join public.courses k on k.id = s.course_id
                 where k.trainer_id = p_trainer and k.status in ('open', 'in_progress') and s.status <> 'cancelled'
                   and (s.starts_at at time zone 'Asia/Riyadh')::date = d::date)
  from generate_series(p_from, p_from + greatest(least(p_days, 60), 1) - 1, interval '1 day') d
  where exists (select 1 from public.profiles p where p.id = p_trainer and (p.is_public or p.id = auth.uid()));
$$;

revoke all on function public.trainer_event_overlaps(timestamptz, timestamptz, text, timestamptz, timestamptz) from public, anon;
revoke all on function public.trainer_calendar_conflicts(timestamptz, timestamptz, uuid) from public, anon;
revoke all on function public.update_trainer_event(uuid, text, text, timestamptz, timestamptz, boolean, text) from public, anon;
grant execute on function
  public.trainer_event_overlaps(timestamptz, timestamptz, text, timestamptz, timestamptz),
  public.trainer_calendar_conflicts(timestamptz, timestamptz, uuid),
  public.update_trainer_event(uuid, text, text, timestamptz, timestamptz, boolean, text)
to authenticated;
