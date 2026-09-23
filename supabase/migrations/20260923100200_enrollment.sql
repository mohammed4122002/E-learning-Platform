-- Enrollment: enrollments, seat holds (BR-L7), discount codes, payments + receipts (BR-L12), waitlist.

create type public.enrollment_status as enum (
  'pending_payment',   -- seat held, waiting for payment (TRN-ENR-05)
  'pending_provider',  -- waiting for the training provider's approval (TRN-MYE-02 · بانتظار الجهة)
  'confirmed',         -- enrolled, course not started yet
  'in_progress',
  'completed',
  'withdrawn',
  'cancelled',         -- course cancelled by provider/platform
  'access_revoked'     -- recorded course access withdrawn (e.g. refund)
);
create type public.payment_status as enum ('pending', 'processing', 'succeeded', 'failed', 'expired', 'refunded');
create type public.waitlist_status as enum ('waiting', 'invited', 'accepted', 'expired', 'left');

create table public.discount_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9_-]{3,32}$'),
  course_id uuid references public.courses (id) on delete cascade,
  percent_off numeric(5, 2) check (percent_off > 0 and percent_off <= 100),
  amount_off numeric(10, 2) check (amount_off > 0),
  max_uses int check (max_uses > 0),
  used_count int not null default 0,
  valid_until timestamptz,
  active boolean not null default true,
  check ((percent_off is null) <> (amount_off is null))
);

create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete restrict,
  trainee_id uuid not null references public.profiles (id) on delete restrict,
  status public.enrollment_status not null,
  list_price numeric(10, 2) not null,
  price_paid numeric(10, 2) not null default 0,
  currency text not null default 'SAR',
  discount_code_id uuid references public.discount_codes (id) on delete set null,
  funding text not null default 'self' check (funding in ('self', 'employer', 'sponsored')),
  hold_expires_at timestamptz,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  completed_at timestamptz,
  ended_at timestamptz,
  end_reason text
);
-- One live enrollment per trainee and course (TRN-ENR-01 · مسجّل فيها مسبقاً).
create unique index enrollments_active_uniq on public.enrollments (course_id, trainee_id)
  where status not in ('withdrawn', 'cancelled', 'access_revoked');
create index enrollments_trainee_idx on public.enrollments (trainee_id, status);
create index enrollments_course_idx on public.enrollments (course_id, status);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.enrollments (id) on delete restrict,
  trainee_id uuid not null references public.profiles (id) on delete restrict,
  amount numeric(10, 2) not null check (amount >= 0),
  currency text not null default 'SAR',
  method text not null check (method in ('card', 'mada', 'apple_pay', 'bank_transfer', 'free')),
  provider text not null,
  provider_ref text,
  status public.payment_status not null default 'pending',
  failure_reason text,
  -- BR-L12: one payment per attempt key, so a double click never charges twice.
  idempotency_key text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index payments_enrollment_idx on public.payments (enrollment_id);
create trigger payments_touch before update on public.payments
  for each row execute function public.touch_updated_at();

create sequence public.receipt_number_seq start 100001;
create table public.receipts (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null unique references public.payments (id) on delete restrict,
  number text not null unique default ('RC-' || nextval('public.receipt_number_seq')::text),
  amount numeric(10, 2) not null,
  vat_amount numeric(10, 2) not null default 0,
  currency text not null,
  issued_at timestamptz not null default now()
);

create table public.waitlist_entries (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  trainee_id uuid not null references public.profiles (id) on delete cascade,
  status public.waitlist_status not null default 'waiting',
  invited_at timestamptz,
  invite_expires_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index waitlist_active_uniq on public.waitlist_entries (course_id, trainee_id)
  where status in ('waiting', 'invited');

-- Seats taken = active enrollments + unexpired holds.
create or replace function public.course_seats_taken(c uuid) returns int
language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.enrollments e
  where e.course_id = c
    and (e.status in ('pending_provider', 'confirmed', 'in_progress', 'completed')
         or (e.status = 'pending_payment' and e.hold_expires_at > now()));
$$;
