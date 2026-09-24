-- «أضاف المدرب محتوى جديدًا» notice: Arabic-Indic digits and dual/plural forms like the rest of the UI.
create or replace function public.publish_new_content(p_course uuid, p_lessons uuid[], p_ack boolean)
returns int
language plpgsql security definer set search_path = '' as $$
declare u uuid := public.require_user(); c public.courses; n int; r record;
begin
  select * into c from public.courses where id = p_course for update;
  if not found or not public.manages_course(p_course) then raise exception 'not_found' using errcode = 'P0001'; end if;
  if c.status = 'draft' then raise exception 'invalid_state' using errcode = 'P0001'; end if;
  if p_ack is not true then raise exception 'ack_required' using errcode = 'P0001'; end if;
  if exists (
    select 1 from public.lessons l where l.course_id = p_course and l.id = any(p_lessons) and l.published_at is null and not (
      (l.kind in ('video', 'file') and l.media_path is not null)
      or (l.kind = 'text' and coalesce(char_length(trim(l.body)), 0) > 0)
      or (l.kind = 'quiz' and exists (select 1 from public.quizzes q where q.lesson_id = l.id and jsonb_array_length(q.questions) > 0)))) then
    raise exception 'lessons_without_material' using errcode = 'P0001';
  end if;
  perform set_config('app.trusted_op', 'on', true);
  update public.lessons set published_at = now()
  where course_id = p_course and id = any(p_lessons) and published_at is null;
  get diagnostics n = row_count;
  if n > 0 then
    for r in select e.id, e.trainee_id from public.enrollments e
             where e.course_id = p_course and e.status in ('confirmed', 'in_progress', 'completed') loop
      perform public.notify(r.trainee_id, 'new_content', 'أضاف المدرب محتوى جديدًا',
        c.title || ' · ' || case when n = 1 then 'درس جديد' when n = 2 then 'درسان جديدان'
          else translate(n::text, '0123456789', '٠١٢٣٤٥٦٧٨٩') || case when n <= 10 then ' دروس جديدة' else ' درسًا جديدًا' end end,
        '/trainee/learn/' || r.id);
    end loop;
  end if;
  return n;
end $$;
