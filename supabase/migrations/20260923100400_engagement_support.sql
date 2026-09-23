-- Engagement & support: preferences (TRN-ONB), experiences, favorites, follows, inquiries, notifications,
-- conversations, refunds (BR-L9), disputes, violation reports, identity verification, help center.

create type public.request_status as enum ('under_review', 'approved', 'rejected');
create type public.dispute_status as enum ('open', 'under_review', 'resolved', 'closed');

create table public.trainee_preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  category_ids uuid[] not null default '{}',
  goal text check (goal in ('career_change', 'promotion', 'skill_up', 'certificate', 'personal')),
  level public.course_level,
  modes public.course_mode[] not null default '{}',
  weekly_hours text check (weekly_hours in ('lt2', '2to5', '5to10', 'gt10')),
  job_title text check (char_length(job_title) <= 120),
  employer text check (char_length(employer) <= 160),
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create table public.experiences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 2 and 160),
  organization text not null check (char_length(organization) between 2 and 160),
  start_date date not null,
  end_date date,
  is_current boolean not null default false,
  description text check (char_length(description) <= 2000),
  created_at timestamptz not null default now(),
  check (end_date is null or end_date >= start_date),
  check (not (is_current and end_date is not null))
);
create index experiences_user_idx on public.experiences (user_id, start_date desc);

create table public.favorites (
  user_id uuid not null references public.profiles (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, course_id)
);

create table public.follows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  trainer_id uuid references public.profiles (id) on delete cascade,
  organization_id uuid references public.organizations (id) on delete cascade,
  category_id uuid references public.categories (id) on delete cascade,
  created_at timestamptz not null default now(),
  check (num_nonnulls(trainer_id, organization_id, category_id) = 1),
  unique nulls not distinct (user_id, trainer_id, organization_id, category_id)
);

create table public.inquiries (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  topic text not null check (topic in ('content', 'schedule', 'price', 'certificate', 'other')),
  question text not null check (char_length(question) between 10 and 2000),
  answer text,
  answered_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null,
  title text not null,
  body text,
  link text check (link is null or link ~ '^/'),
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  course_id uuid references public.courses (id) on delete set null,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);
create table public.conversation_participants (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  last_read_at timestamptz,
  primary key (conversation_id, user_id)
);
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  attachment_path text,
  created_at timestamptz not null default now()
);
create index messages_conversation_idx on public.messages (conversation_id, created_at);

create or replace function public.is_conversation_member(c uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.conversation_participants p where p.conversation_id = c and p.user_id = auth.uid());
$$;

create or replace function public.bump_conversation() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.conversations set last_message_at = new.created_at where id = new.conversation_id;
  update public.conversation_participants set last_read_at = new.created_at
    where conversation_id = new.conversation_id and user_id = new.sender_id;
  return new;
end $$;
create trigger messages_bump after insert on public.messages
  for each row execute function public.bump_conversation();

create table public.refund_requests (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.enrollments (id) on delete restrict,
  trainee_id uuid not null references public.profiles (id) on delete restrict,
  reason text not null check (reason in ('schedule', 'content_mismatch', 'quality', 'personal', 'duplicate', 'other')),
  details text check (char_length(details) <= 2000),
  amount numeric(10, 2) not null,
  -- BR-L9: requests after the certificate was issued need an admin decision.
  requires_admin boolean not null default false,
  status public.request_status not null default 'under_review',
  decision_note text,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
create unique index refund_open_uniq on public.refund_requests (enrollment_id) where status = 'under_review';

create table public.disputes (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments (id) on delete restrict,
  trainee_id uuid not null references public.profiles (id) on delete restrict,
  reason text not null check (reason in ('double_charge', 'not_delivered', 'wrong_amount', 'refund_not_received', 'other')),
  details text not null check (char_length(details) between 20 and 4000),
  status public.dispute_status not null default 'open',
  resolution text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger disputes_touch before update on public.disputes
  for each row execute function public.touch_updated_at();
create table public.dispute_attachments (
  id uuid primary key default gen_random_uuid(),
  dispute_id uuid not null references public.disputes (id) on delete cascade,
  file_path text not null,
  file_name text not null,
  size_bytes int not null check (size_bytes > 0 and size_bytes <= 10485760),
  created_at timestamptz not null default now()
);

create table public.violation_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  target_type text not null check (target_type in ('course', 'trainer', 'organization', 'review', 'message')),
  target_id uuid not null,
  reason text not null check (reason in ('misleading', 'inappropriate', 'fraud', 'harassment', 'copyright', 'other')),
  details text check (char_length(details) <= 2000),
  status text not null default 'open' check (status in ('open', 'reviewing', 'actioned', 'dismissed')),
  created_at timestamptz not null default now()
);

create table public.identity_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  document_type text not null check (document_type in ('national_id', 'iqama', 'passport')),
  document_number_last4 text check (document_number_last4 ~ '^[0-9A-Z]{4}$'),
  document_path text not null,
  selfie_path text,
  status public.review_status not null default 'pending',
  reviewer_note text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create index identity_verifications_user_idx on public.identity_verifications (user_id, submitted_at desc);

create table public.help_articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  category text not null,
  title text not null,
  body text not null,
  position int not null default 0,
  published boolean not null default true
);
