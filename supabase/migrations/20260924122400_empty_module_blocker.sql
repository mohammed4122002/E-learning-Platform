-- Recorded courses: every module needs at least one lesson before publishing (Figma «شروط النشر» · «كل وحدة لها درس»).
create or replace function public.course_publish_blockers(p_course uuid)
returns table (code text, detail text)
language plpgsql stable security definer set search_path = '' as $$
declare c public.courses; url text; bad text;
begin
  select * into c from public.courses where id = p_course;
  if not found or not (public.manages_course(p_course) or public.is_admin()
                       or coalesce(current_setting('app.trusted_op', true), '') = 'on') then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  if c.pricing_set_at is null then code := 'price_missing'; detail := null; return next; end if;
  if coalesce(c.duration_hours, 0) <= 0 then code := 'hours_missing'; detail := null; return next; end if;
  if c.mode = 'recorded' then
    if not exists (select 1 from public.lessons l where l.course_id = p_course) then
      code := 'no_content'; detail := null; return next;
    else
      select string_agg('«' || l.title || '»', ' و' order by m.position, l.position) into bad
      from public.lessons l join public.course_modules m on m.id = l.module_id
      where l.course_id = p_course and not (
        (l.kind in ('video', 'file') and l.media_path is not null)
        or (l.kind = 'text' and coalesce(char_length(trim(l.body)), 0) > 0)
        or (l.kind = 'quiz' and exists (select 1 from public.quizzes q where q.lesson_id = l.id and jsonb_array_length(q.questions) > 0)));
      if bad is not null then code := 'lessons_without_material'; detail := bad; return next; end if;
      select string_agg('«' || m.title || '»', ' و' order by m.position) into bad
      from public.course_modules m
      where m.course_id = p_course and not exists (select 1 from public.lessons l where l.module_id = m.id);
      if bad is not null then code := 'empty_modules'; detail := bad; return next; end if;
      if not exists (select 1 from public.lessons l where l.course_id = p_course and l.is_preview) then
        code := 'no_preview'; detail := null; return next;
      end if;
    end if;
  else
    if c.capacity is null then code := 'seats_missing'; detail := null; return next; end if;
    if not exists (select 1 from public.course_sessions s where s.course_id = p_course and s.status <> 'cancelled') then
      code := 'schedule_missing'; detail := null; return next;
    end if;
    if c.mode = 'in_person' and coalesce(char_length(trim(c.venue)), 0) = 0 then
      code := 'venue_missing'; detail := null; return next;
    end if;
    if c.mode = 'live_remote' then
      select meeting_url into url from public.course_private where course_id = p_course;
      if url is null or c.meeting_platform is null then code := 'meeting_missing'; detail := null; return next; end if;
    end if;
  end if;
end $$;
