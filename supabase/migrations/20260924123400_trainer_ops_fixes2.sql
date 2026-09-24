-- postpone_course: the new end date may fall on the last session's day even when that session ends later than the
-- course's previous end time. The end is compared by date and becomes the later of the two timestamps
-- (found while postponing a QA course). Same signature, create or replace.
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

  update public.course_sessions set starts_at = starts_at + delta, ends_at = ends_at + delta
  where course_id = p_course and status <> 'cancelled';
  select max(s.ends_at) into last_end from public.course_sessions s where s.course_id = p_course and s.status <> 'cancelled';
  new_end := (p_ends_on + coalesce((c.ends_at at time zone 'Asia/Riyadh')::time, time '23:00')) at time zone 'Asia/Riyadh';
  if last_end is not null and p_ends_on < (last_end at time zone 'Asia/Riyadh')::date then
    raise exception 'invalid_dates' using errcode = 'P0001';
  end if;
  new_end := greatest(new_end, coalesce(last_end, new_end));
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
