-- Quiz summaries for an enrolled trainee (TRN-MYE-04 / TRN-LRN-03 / TRN-LRN-06): trainees cannot read
-- public.quizzes (the answer key lives there), so the course outline gets quiz ids and sizes from here.
create or replace function public.course_quizzes(p_course uuid)
returns table (id uuid, lesson_id uuid, title text, pass_percent int, time_limit_minutes int, max_attempts int, question_count int)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_user();
  if not (public.is_enrolled(p_course) or public.manages_course(p_course)) then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  return query
    select q.id, q.lesson_id, q.title, q.pass_percent, q.time_limit_minutes, q.max_attempts, jsonb_array_length(q.questions)
    from public.quizzes q where q.course_id = p_course;
end $$;

revoke execute on function public.course_quizzes(uuid) from public, anon, authenticated;
grant execute on function public.course_quizzes(uuid) to authenticated;
