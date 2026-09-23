-- TRN-CRT-02 · شروط إصدار الشهادة. One row per condition that applies to the enrollment's course
-- (lessons watched, quizzes passed, assignments accepted, sessions attended). Read-only; quizzes are not
-- readable by trainees through RLS, so this runs as definer and only exposes counts and quiz metadata.
create or replace function public.certificate_conditions(p_enrollment uuid)
returns table (key text, done int, total int, met boolean, info jsonb)
language plpgsql stable security definer set search_path = '' as $$
declare
  u uuid := public.require_user();
  e public.enrollments;
  n_total int; n_done int; avg_score int; nq jsonb;
begin
  select * into e from public.enrollments x where x.id = p_enrollment;
  if not found or (e.trainee_id <> u and not public.manages_course(e.course_id)) then
    raise exception 'not_found' using errcode = 'P0001';
  end if;

  -- Lessons (BR-L10/BR-L11: ≥ 90 % watched = complete).
  select count(*)::int into n_total from public.lessons l where l.course_id = e.course_id and l.published_at is not null;
  if n_total > 0 then
    select count(*)::int into n_done from public.lesson_progress p join public.lessons l on l.id = p.lesson_id
      where p.course_id = e.course_id and p.trainee_id = e.trainee_id and p.completed_at is not null and l.published_at is not null;
    return query select 'lessons'::text, n_done, n_total, n_done >= n_total,
      jsonb_build_object('last_completed_at', (select max(p.completed_at) from public.lesson_progress p
                                               where p.course_id = e.course_id and p.trainee_id = e.trainee_id));
  end if;

  -- Quizzes.
  select count(*)::int into n_total from public.quizzes q where q.course_id = e.course_id;
  if n_total > 0 then
    select count(distinct a.quiz_id)::int, coalesce(round(avg(a.score_percent)), 0)::int into n_done, avg_score
      from public.quiz_attempts a join public.quizzes q on q.id = a.quiz_id
      where q.course_id = e.course_id and a.trainee_id = e.trainee_id and a.passed;
    select jsonb_build_object('title', q.title, 'pass_percent', q.pass_percent, 'time_limit_minutes', q.time_limit_minutes,
                              'question_count', jsonb_array_length(q.questions),
                              'attempts', (select count(*) from public.quiz_attempts a2 where a2.quiz_id = q.id and a2.trainee_id = e.trainee_id))
      into nq
      from public.quizzes q
      where q.course_id = e.course_id
        and not exists (select 1 from public.quiz_attempts a where a.quiz_id = q.id and a.trainee_id = e.trainee_id and a.passed)
      order by q.id limit 1;
    return query select 'quizzes'::text, n_done, n_total, n_done >= n_total,
      jsonb_build_object('avg_score', avg_score, 'next', nq);
  end if;

  -- Assignments.
  select count(*)::int into n_total from public.assignments a where a.course_id = e.course_id;
  if n_total > 0 then
    select count(distinct s.assignment_id)::int into n_done from public.assignment_submissions s
      join public.assignments a on a.id = s.assignment_id
      where a.course_id = e.course_id and s.trainee_id = e.trainee_id and s.status = 'accepted';
    return query select 'assignments'::text, n_done, n_total, n_done >= n_total,
      jsonb_build_object('best_score', (select max(s.score) from public.assignment_submissions s join public.assignments a on a.id = s.assignment_id
                                        where a.course_id = e.course_id and s.trainee_id = e.trainee_id),
                         'max_score', (select max(a.max_score) from public.assignments a where a.course_id = e.course_id));
  end if;

  -- Attendance (live / in-person): 80 % of the scheduled sessions.
  select count(*)::int into n_total from public.course_sessions s where s.course_id = e.course_id and s.status <> 'cancelled';
  if n_total > 0 then
    select count(*)::int into n_done from public.attendance t join public.course_sessions s on s.id = t.session_id
      where s.course_id = e.course_id and t.trainee_id = e.trainee_id and s.status <> 'cancelled';
    return query select 'attendance'::text, n_done, n_total, n_done * 100 >= n_total * 80,
      jsonb_build_object('required', ceil(n_total * 0.8)::int,
                         'next_session_at', (select min(s.starts_at) from public.course_sessions s
                                             where s.course_id = e.course_id and s.status = 'scheduled' and s.starts_at > now()));
  end if;
end $$;
revoke execute on function public.certificate_conditions(uuid) from public, anon, authenticated;
grant execute on function public.certificate_conditions(uuid) to authenticated;
