-- Learning: lesson progress (BR-L10/BR-L11), attendance, quizzes, assignments, certificates (BR-R2/BR-L9), ratings (BR-R3).

create type public.certificate_status as enum ('issued', 'revoked');
create type public.submission_status as enum ('submitted', 'needs_revision', 'accepted', 'rejected');

-- BR-L11: watching is progress. A lesson is complete once watched to ~90%.
create table public.lesson_progress (
  trainee_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  position_seconds int not null default 0 check (position_seconds >= 0),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (trainee_id, lesson_id)
);
create index lesson_progress_course_idx on public.lesson_progress (trainee_id, course_id);

create table public.attendance (
  session_id uuid not null references public.course_sessions (id) on delete cascade,
  trainee_id uuid not null references public.profiles (id) on delete cascade,
  checked_in_at timestamptz not null default now(),
  method text not null default 'qr' check (method in ('qr', 'manual', 'online')),
  primary key (session_id, trainee_id)
);

create table public.attendance_codes (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.course_sessions (id) on delete cascade,
  code text not null unique,
  expires_at timestamptz not null
);

create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  lesson_id uuid references public.lessons (id) on delete set null,
  title text not null,
  pass_percent int not null default 60 check (pass_percent between 0 and 100),
  time_limit_minutes int check (time_limit_minutes > 0),
  -- [{ "id": "q1", "text": "...", "options": ["..."], "answer": 0 }]; answers never reach the client.
  questions jsonb not null default '[]'::jsonb
);

create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  trainee_id uuid not null references public.profiles (id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  score_percent int,
  passed boolean,
  started_at timestamptz not null default now(),
  submitted_at timestamptz
);
create index quiz_attempts_idx on public.quiz_attempts (trainee_id, quiz_id);

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  title text not null,
  instructions text,
  due_at timestamptz,
  max_score int not null default 100
);

create table public.assignment_submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments (id) on delete cascade,
  trainee_id uuid not null references public.profiles (id) on delete cascade,
  status public.submission_status not null default 'submitted',
  file_path text,
  note text check (char_length(note) <= 4000),
  feedback text,
  score int,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create index submissions_idx on public.assignment_submissions (trainee_id, assignment_id);

create table public.certificates (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)),
  enrollment_id uuid not null unique references public.enrollments (id) on delete restrict,
  trainee_id uuid not null references public.profiles (id) on delete restrict,
  course_id uuid not null references public.courses (id) on delete restrict,
  -- BR-R2: provider courses issue in the provider's name; the trainer's name still shows.
  issuer_organization_id uuid references public.organizations (id) on delete restrict,
  trainer_id uuid not null references public.profiles (id) on delete restrict,
  trainee_name text not null,
  course_title text not null,
  hours numeric(6, 1),
  status public.certificate_status not null default 'issued',
  issued_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoke_reason text
);
create index certificates_trainee_idx on public.certificates (trainee_id);

create table public.external_certificates (
  id uuid primary key default gen_random_uuid(),
  trainee_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 2 and 200),
  issuer text not null check (char_length(issuer) between 2 and 200),
  issued_on date not null,
  credential_url text,
  file_path text,
  status public.review_status not null default 'pending',
  reviewer_note text,
  created_at timestamptz not null default now()
);

-- BR-R3: content + trainer axes go to the trainer; organization axis to the provider.
create table public.course_ratings (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  enrollment_id uuid not null unique references public.enrollments (id) on delete cascade,
  trainee_id uuid not null references public.profiles (id) on delete cascade,
  content_score int not null check (content_score between 1 and 5),
  trainer_score int not null check (trainer_score between 1 and 5),
  organization_score int check (organization_score between 1 and 5),
  comment text check (char_length(comment) <= 2000),
  created_at timestamptz not null default now()
);

create or replace function public.refresh_course_rating() returns trigger
language plpgsql security definer set search_path = '' as $$
declare c uuid := coalesce(new.course_id, old.course_id);
begin
  update public.courses set
    rating_avg = coalesce((select round(avg((r.content_score + r.trainer_score + coalesce(r.organization_score, r.trainer_score)) / 3.0), 2)
                           from public.course_ratings r where r.course_id = c), 0),
    rating_count = (select count(*) from public.course_ratings r where r.course_id = c)
  where id = c;
  return null;
end $$;
create trigger course_ratings_refresh after insert or update or delete on public.course_ratings
  for each row execute function public.refresh_course_rating();
