-- Fixes found while testing the trainer-ops RPCs against the QA data (same signatures, create or replace).

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
               group by s.assignment_id) b), 0)::numeric end as pts
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


-- «راسل المسجّلين» on a cancelled course (4236:1195): the cancelled trainees are still the audience.
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
      and (e.status in ('pending_provider', 'confirmed', 'in_progress', 'completed')
           or (c.status = 'cancelled' and e.status = 'cancelled' and e.end_reason = 'course_cancelled'))
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
