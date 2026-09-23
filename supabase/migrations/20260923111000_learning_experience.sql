-- Learning experience (TRN-LRN-03/04/05/07, TRN-MYE-04): assignment details, attempt limits and quiz review.
-- Additive only: new nullable/defaulted columns, a quiz review RPC and stricter versions of submit_* RPCs.

-- ── Assignments: what the Figma "المطلوب منك / مسار الواجب / تفصيل الدرجة" cards need ──────────────
alter table public.assignments
  add column module_id uuid references public.course_modules (id) on delete set null,
  add column requirements text[] not null default '{}',
  add column max_attempts int not null default 3 check (max_attempts between 1 and 10),
  add column weight_percent int check (weight_percent between 0 and 100),
  add column pass_score int check (pass_score >= 0),
  add column accepted_formats text not null default 'PDF',
  add column max_file_mb int not null default 10 check (max_file_mb between 1 and 25),
  -- [{ "id": "scope", "label": "وضوح الهدف والنطاق", "max": 5 }]
  add column rubric jsonb not null default '[]'::jsonb,
  add column opens_at timestamptz not null default now();

-- Reviewer's per-criterion scores: { "<rubric id>": <score> }.
alter table public.assignment_submissions
  add column rubric_scores jsonb not null default '{}'::jsonb,
  add column file_name text check (char_length(file_name) <= 200),
  add column file_size int check (file_size >= 0);

-- ── Quizzes: attempt limit (Figma "المحاولة الأولى من اثنتين") ──────────────────────────────────
alter table public.quizzes add column max_attempts int not null default 2 check (max_attempts between 1 and 10);

-- Submitting an assignment (TRN-LRN-05).
--  · no open attempt → new attempt (bounded by max_attempts)
--  · latest attempt still unreviewed → the file/note are replaced in place ("استبدل الملف" until the deadline)
--  · accepted → nothing left to submit
-- (new name so the original submit_assignment keeps its contract for other callers)
create or replace function public.submit_assignment_file(p_assignment uuid, p_file_path text, p_note text, p_file_name text, p_file_size int)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  u uuid := public.require_user();
  a public.assignments;
  last public.assignment_submissions;
  n int;
  sid uuid;
begin
  select * into a from public.assignments where id = p_assignment;
  if not found or not public.is_enrolled(a.course_id) then raise exception 'not_found' using errcode = 'P0001'; end if;
  if a.due_at is not null and a.due_at < now() then raise exception 'deadline_passed' using errcode = 'P0001'; end if;
  if p_file_path is not null and split_part(p_file_path, '/', 1) <> u::text then raise exception 'forbidden' using errcode = 'P0001'; end if;
  if p_file_path is not null and split_part(p_file_path, '/', 2) <> a.id::text then raise exception 'forbidden' using errcode = 'P0001'; end if;
  if p_file_path is null and coalesce(trim(p_note), '') = '' then raise exception 'invalid_input' using errcode = 'P0001'; end if;
  if char_length(coalesce(p_note, '')) > 4000 then raise exception 'invalid_input' using errcode = 'P0001'; end if;

  select * into last from public.assignment_submissions s
  where s.assignment_id = a.id and s.trainee_id = u order by s.submitted_at desc limit 1 for update;

  if found and last.status = 'accepted' then raise exception 'already_accepted' using errcode = 'P0001'; end if;

  if found and last.status = 'submitted' and last.reviewed_at is null then
    update public.assignment_submissions set
      file_path = coalesce(p_file_path, file_path),
      file_name = case when p_file_path is null then file_name else left(p_file_name, 200) end,
      file_size = case when p_file_path is null then file_size else p_file_size end,
      note = nullif(trim(p_note), ''),
      submitted_at = now()
    where id = last.id returning id into sid;
    return sid;
  end if;

  select count(*) into n from public.assignment_submissions s where s.assignment_id = a.id and s.trainee_id = u;
  if n >= a.max_attempts then raise exception 'attempts_exhausted' using errcode = 'P0001'; end if;

  insert into public.assignment_submissions (assignment_id, trainee_id, file_path, file_name, file_size, note)
  values (a.id, u, p_file_path, left(p_file_name, 200), p_file_size, nullif(trim(p_note), '')) returning id into sid;
  return sid;
end $$;

-- Quiz submission with the attempt limit enforced server-side.
create or replace function public.submit_quiz_attempt(p_quiz uuid, p_answers jsonb)
returns table (attempt_id uuid, score_percent int, passed boolean, correct int, total int, attempt_no int, max_attempts int)
language plpgsql security definer set search_path = '' as $$
declare u uuid := public.require_user(); q public.quizzes; n int; ok int; sc int; aid uuid; prev int;
begin
  select * into q from public.quizzes where id = p_quiz;
  if not found or not public.is_enrolled(q.course_id) then raise exception 'not_found' using errcode = 'P0001'; end if;
  if jsonb_typeof(p_answers) <> 'object' then raise exception 'invalid_input' using errcode = 'P0001'; end if;
  perform 1 from public.enrollments e where e.course_id = q.course_id and e.trainee_id = u
    and e.status in ('confirmed', 'in_progress', 'completed') for update;
  select count(*) into prev from public.quiz_attempts x where x.quiz_id = q.id and x.trainee_id = u and x.submitted_at is not null;
  if exists (select 1 from public.quiz_attempts x where x.quiz_id = q.id and x.trainee_id = u and x.passed) then
    raise exception 'already_passed' using errcode = 'P0001';
  end if;
  if prev >= q.max_attempts then raise exception 'attempts_exhausted' using errcode = 'P0001'; end if;
  select count(*), count(*) filter (where (p_answers ->> (x ->> 'id')) = (x ->> 'answer'))
    into n, ok from jsonb_array_elements(q.questions) x;
  sc := case when n = 0 then 0 else ok * 100 / n end;
  insert into public.quiz_attempts (quiz_id, trainee_id, answers, score_percent, passed, submitted_at)
  values (q.id, u, p_answers, sc, sc >= q.pass_percent, now()) returning id into aid;
  return query select aid, sc, sc >= q.pass_percent, ok, n, prev + 1, q.max_attempts;
end $$;

-- Per-question review of one's own attempt. The correct option is revealed only once the quiz can no
-- longer be retaken (passed, or no attempts left), so a failed attempt never leaks the answer key.
create or replace function public.quiz_attempt_review(p_attempt uuid)
returns table (question_id text, question text, options jsonb, chosen text, is_correct boolean, correct_answer text)
language plpgsql stable security definer set search_path = '' as $$
declare u uuid := public.require_user(); t public.quiz_attempts; q public.quizzes; reveal boolean; used int;
begin
  select * into t from public.quiz_attempts where id = p_attempt and trainee_id = u and submitted_at is not null;
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
  select * into q from public.quizzes where id = t.quiz_id;
  select count(*) into used from public.quiz_attempts x where x.quiz_id = q.id and x.trainee_id = u and x.submitted_at is not null;
  reveal := coalesce(t.passed, false) or used >= q.max_attempts;
  return query
    select x ->> 'id', x ->> 'text', x -> 'options', t.answers ->> (x ->> 'id'),
           coalesce((t.answers ->> (x ->> 'id')) = (x ->> 'answer'), false),
           case when reveal then x ->> 'answer' end
    from jsonb_array_elements(q.questions) with ordinality as e(x, i)
    order by e.i;
end $$;

revoke execute on function public.submit_assignment_file(uuid, text, text, text, int) from public, anon, authenticated;
revoke execute on function public.submit_quiz_attempt(uuid, jsonb) from public, anon, authenticated;
revoke execute on function public.quiz_attempt_review(uuid) from public, anon, authenticated;
grant execute on function public.submit_assignment_file(uuid, text, text, text, int) to authenticated;
grant execute on function public.submit_quiz_attempt(uuid, jsonb) to authenticated;
grant execute on function public.quiz_attempt_review(uuid) to authenticated;

-- ── Seed: practical assignments for the seeded courses (so TRN-LRN-05/07 have data) ────────────
do $$
declare acc uuid; des uuid; m1 uuid; m2 uuid;
begin
  select id into acc from public.courses where slug = 'intro-managerial-accounting';
  select id into des from public.courses where slug = 'design-basics';
  if acc is not null and not exists (select 1 from public.assignments where course_id = acc) then
    select id into m1 from public.course_modules where course_id = acc and position = 2;
    select id into m2 from public.course_modules where course_id = acc and position = 3;
    insert into public.assignments (course_id, module_id, title, instructions, due_at, max_score, requirements, max_attempts,
                                    weight_percent, pass_score, accepted_formats, max_file_mb, rubric, opens_at)
    values
      (acc, m1, 'الواجب العملي — تحليل القوائم المالية لشركة حقيقية',
       'اختر شركة مدرجة في السوق المالية وحلّل قائمتي الدخل والمركز المالي لآخر سنتين. استخدم النسب المالية التي درستها في الفصل الثاني، واكتب توصية قصيرة للإدارة.',
       now() + interval '21 days', 20,
       array['قائمة الدخل والميزانية لسنتين متتاليتين', 'خمس نسب مالية على الأقل مع تفسيرها', 'توصية للإدارة في فقرة واحدة'],
       3, 20, 12, 'PDF', 10,
       '[{"id":"data","label":"دقة البيانات المالية","max":5},{"id":"ratios","label":"حساب النسب وتفسيرها","max":5},{"id":"insight","label":"جودة التحليل","max":4},{"id":"recommendation","label":"التوصية للإدارة","max":4},{"id":"presentation","label":"العرض والتنظيم","max":2}]'::jsonb,
       now() - interval '7 days'),
      (acc, m2, 'تمرين تحليل التعادل لمنتج من اختيارك',
       'احسب نقطة التعادل لمنتج أو خدمة تعرفها جيدًا: صنّف التكاليف إلى ثابتة ومتغيرة، واحسب هامش المساهمة، ثم ارسم مخطط التعادل.',
       now() + interval '35 days', 20,
       array['جدول التكاليف الثابتة والمتغيرة', 'حساب هامش المساهمة ونقطة التعادل', 'مخطط التعادل مع شرح مختصر'],
       3, 15, 12, 'PDF', 10,
       '[{"id":"costs","label":"تصنيف التكاليف","max":6},{"id":"calc","label":"دقة الحساب","max":8},{"id":"chart","label":"المخطط والشرح","max":6}]'::jsonb,
       now() - interval '2 days');
  end if;
  if des is not null and not exists (select 1 from public.assignments where course_id = des) then
    insert into public.assignments (course_id, title, instructions, due_at, max_score, requirements, max_attempts,
                                    weight_percent, pass_score, accepted_formats, max_file_mb, rubric, opens_at)
    values (des, 'لوحة الهوية البصرية لعلامة ناشئة',
            'صمّم لوحة هوية بصرية لعلامة تجارية ناشئة: الشعار المبدئي، لوحة الألوان، الخطوط، ومثالين للتطبيق.',
            now() + interval '28 days', 20,
            array['شعار مبدئي بنسختين', 'لوحة ألوان من خمسة ألوان مع رموزها', 'زوج خطوط مع مثال للاستخدام', 'تطبيقان للهوية (بطاقة ومنشور)'],
            2, 25, 12, 'PDF أو PNG', 10,
            '[{"id":"concept","label":"وضوح الفكرة","max":6},{"id":"color","label":"اللون والتباين","max":5},{"id":"type","label":"الطباعة","max":5},{"id":"application","label":"التطبيقات","max":4}]'::jsonb,
            now() - interval '3 days');
  end if;
end $$;
