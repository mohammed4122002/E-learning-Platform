-- TRR-FIN-01…04 · الرصيد والمستحقات / تفاصيل التسوية / بيانات التحويل البنكي / طلب سحب.
--
-- Money model (single source of truth for every trainer figure — finance pages, dashboard «رصيدك», queue):
--   • trainer_ledger_entries: one frozen row per money event on the trainer's own courses, written by triggers:
--       sale        — a succeeded payment: gross = price_paid − VAT (VAT 15 % exclusive is collected and remitted,
--                     never the trainer's), commission = gross × platform_commission_percent() at sale time.
--       refund      — an approved refund request: the refunded share of the sale (commission returned pro rata) plus
--                     the refund processing fee (refund_processing_fee_percent, Figma 310:10328) when the trainee
--                     left a scheduled course before it started.
--       chargeback  — a payment marked refunded without an approved refund request: the whole sale is reversed.
--   • Release (Figma «يُفرَج»): scheduled courses 7 days after the course ends (the course must be completed),
--     recorded courses 14 days after each purchase (the recorded refund window). Refunds follow their sale: before
--     the sale is released they net out inside it; after it they are deducted when they happen.
--   • Settlement = the calendar month (Asia/Riyadh) in which entries are released; number STL-YYYY-MMDD (month end).
--   • Available to withdraw = released net − completed withdrawals. A withdrawal only changes the balance when an
--     admin marks it completed (there is no payout provider; nothing moves money automatically).
--   • trainer_commission_percent (…120000) is superseded by platform_commission_percent(); trainer_stats() now
--     reads the ledger so the dashboard and the finance pages always show the same numbers.

-- ── Settings (operational values, editable without a deploy) ──────────────────────────────────────────────────
insert into public.app_settings (key, value) values
  ('withdrawal_min_amount', '500'::jsonb),          -- FIN-01 «الحد الأدنى للسحب ٥٠٠ ر.س»
  ('withdrawal_fee_amount', '15'::jsonb),           -- FIN-04 «رسوم التحويل البنكي − ١٥٫٠٠ ر.س»
  ('refund_processing_fee_percent', '3'::jsonb)     -- FIN-02 «رسوم المعالجة ٣٪ … قبل بدء الدورة»
on conflict (key) do nothing;

create or replace function public.setting_numeric(p_key text, p_default numeric) returns numeric
language sql stable security definer set search_path = '' as $$
  select coalesce((select (value #>> '{}')::numeric from public.app_settings where key = p_key), p_default);
$$;

-- ── Saudi banks (SAMA IBAN bank codes, IBAN characters 5–6) ────────────────────────────────────────────────────
create table public.saudi_banks (
  code text primary key check (code ~ '^[0-9]{2}$'),
  name text not null,
  sort integer not null default 0
);
alter table public.saudi_banks enable row level security;
create policy saudi_banks_read on public.saudi_banks for select to authenticated using (true);
insert into public.saudi_banks (code, name, sort) values
  ('10', 'البنك الأهلي السعودي', 1),
  ('80', 'مصرف الراجحي', 2),
  ('20', 'بنك الرياض', 3),
  ('45', 'البنك السعودي الأول', 4),
  ('55', 'البنك السعودي الفرنسي', 5),
  ('30', 'البنك العربي الوطني', 6),
  ('05', 'مصرف الإنماء', 7),
  ('15', 'بنك البلاد', 8),
  ('60', 'بنك الجزيرة', 9),
  ('65', 'البنك السعودي للاستثمار', 10),
  ('76', 'بنك مسقط', 11),
  ('95', 'بنك الإمارات دبي الوطني', 12),
  ('90', 'بنك الخليج الدولي', 13),
  ('71', 'بنك البحرين الوطني', 14),
  ('75', 'بنك الكويت الوطني', 15)
on conflict (code) do nothing;

-- Saudi IBAN: SA + 2 check digits + 2-digit bank code + 18 account characters, ISO 13616 mod-97 checksum.
create or replace function public.is_valid_saudi_iban(p text) returns boolean
language plpgsql immutable set search_path = '' as $$
declare
  s text;
  ch text;
  d text;
  r integer := 0;
begin
  if p is null or p !~ '^SA[0-9]{4}[0-9A-Z]{18}$' then return false; end if;
  s := substr(p, 5) || substr(p, 1, 4);
  for i in 1 .. length(s) loop
    ch := substr(s, i, 1);
    d := case when ch ~ '[0-9]' then ch else (ascii(ch) - 55)::text end;
    for j in 1 .. length(d) loop
      r := (r * 10 + substr(d, j, 1)::integer) % 97;
    end loop;
  end loop;
  return r = 1;
end $$;

-- ── Ledger ─────────────────────────────────────────────────────────────────────────────────────────────────────
create sequence public.trainer_refund_ref_seq;

create table public.trainer_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.profiles (id),
  course_id uuid not null references public.courses (id),
  enrollment_id uuid not null references public.enrollments (id),
  payment_id uuid not null references public.payments (id),
  refund_request_id uuid references public.refund_requests (id),
  kind text not null check (kind in ('sale', 'refund', 'chargeback')),
  reference text unique,
  occurred_at timestamptz not null,
  gross numeric(12, 2) not null,
  commission_percent numeric(5, 2) not null check (commission_percent between 0 and 100),
  commission numeric(12, 2) not null,
  fee numeric(12, 2) not null default 0 check (fee >= 0),
  net numeric(12, 2) not null,
  refund_percent numeric(5, 2),
  days_before_start integer,
  currency text not null default 'SAR',
  created_at timestamptz not null default now(),
  check (net = gross - commission - fee),
  check ((kind = 'sale' and gross > 0 and commission >= 0) or (kind <> 'sale' and gross <= 0 and commission <= 0))
);
create unique index trainer_ledger_sale_uidx on public.trainer_ledger_entries (payment_id) where kind = 'sale';
create unique index trainer_ledger_chargeback_uidx on public.trainer_ledger_entries (payment_id) where kind = 'chargeback';
create unique index trainer_ledger_refund_uidx on public.trainer_ledger_entries (refund_request_id);
create index trainer_ledger_trainer_idx on public.trainer_ledger_entries (trainer_id, occurred_at);
create index trainer_ledger_course_idx on public.trainer_ledger_entries (course_id);
create index trainer_ledger_enrollment_idx on public.trainer_ledger_entries (enrollment_id);
create index trainer_ledger_payment_idx on public.trainer_ledger_entries (payment_id);

alter table public.trainer_ledger_entries enable row level security;
create policy trainer_ledger_read on public.trainer_ledger_entries for select to authenticated
  using (trainer_id = (select auth.uid()) or (select public.is_admin()));
revoke insert, update, delete, truncate on public.trainer_ledger_entries from anon, authenticated;
revoke select on public.trainer_ledger_entries from anon;

create or replace function public.ledger_record_sale(p_payment uuid, p_at timestamptz) returns void
language plpgsql security definer set search_path = '' as $$
declare
  p public.payments;
  e public.enrollments;
  c public.courses;
  g numeric;
  pct numeric;
  com numeric;
begin
  select * into p from public.payments where id = p_payment;
  if not found or p.status not in ('succeeded', 'refunded') then return; end if;
  select * into e from public.enrollments where id = p.enrollment_id;
  select * into c from public.courses where id = e.course_id;
  if c.id is null or c.trainer_id is null then return; end if;
  g := round(e.price_paid - e.vat_amount, 2);
  if g <= 0 then return; end if;
  pct := public.platform_commission_percent();
  com := round(g * pct / 100, 2);
  insert into public.trainer_ledger_entries
    (trainer_id, course_id, enrollment_id, payment_id, kind, occurred_at, gross, commission_percent, commission, fee, net, currency)
  values (c.trainer_id, c.id, e.id, p.id, 'sale', p_at, g, pct, com, 0, g - com, coalesce(p.currency, 'SAR'))
  on conflict (payment_id) where kind = 'sale' do nothing;
end $$;

create or replace function public.ledger_record_refund(p_refund uuid, p_at timestamptz) returns void
language plpgsql security definer set search_path = '' as $$
declare
  r public.refund_requests;
  e public.enrollments;
  c public.courses;
  s public.trainer_ledger_entries;
  ratio numeric;
  g numeric;
  com numeric;
  fee numeric := 0;
  first_start timestamptz;
  left_at timestamptz;
  days integer;
begin
  select * into r from public.refund_requests where id = p_refund;
  if not found or r.status <> 'approved' or r.cancelled_at is not null or coalesce(r.amount, 0) <= 0 then return; end if;
  select * into s from public.trainer_ledger_entries x where x.enrollment_id = r.enrollment_id and x.kind = 'sale'
    order by x.occurred_at desc limit 1;
  if not found then return; end if;
  if exists (select 1 from public.trainer_ledger_entries x where x.payment_id = s.payment_id and x.kind = 'chargeback') then return; end if;
  select * into e from public.enrollments where id = r.enrollment_id;
  select * into c from public.courses where id = e.course_id;
  ratio := least(r.amount / nullif(e.price_paid, 0), 1);
  if ratio is null or ratio <= 0 then return; end if;
  g := round(s.gross * ratio, 2);
  com := round(g * s.commission_percent / 100, 2);
  select min(x.starts_at) into first_start from public.course_sessions x where x.course_id = c.id and x.status <> 'cancelled';
  first_start := coalesce(first_start, c.starts_at);
  left_at := coalesce(e.ended_at, r.created_at);
  if c.mode <> 'recorded' and first_start is not null and left_at < first_start then
    fee := round(g * public.setting_numeric('refund_processing_fee_percent', 3) / 100, 2);
    days := floor(extract(epoch from (first_start - left_at)) / 86400)::integer;
  end if;
  insert into public.trainer_ledger_entries
    (trainer_id, course_id, enrollment_id, payment_id, refund_request_id, kind, reference, occurred_at, gross,
     commission_percent, commission, fee, net, refund_percent, days_before_start, currency)
  values (s.trainer_id, s.course_id, s.enrollment_id, s.payment_id, r.id, 'refund',
          'RFD-' || to_char(p_at at time zone 'Asia/Riyadh', 'YYYY') || '-' || lpad(nextval('public.trainer_refund_ref_seq')::text, 4, '0'),
          p_at, -g, s.commission_percent, -com, fee, -g + com - fee, round(ratio * 100, 2), days, s.currency)
  on conflict (refund_request_id) do nothing;
end $$;

create or replace function public.ledger_record_chargeback(p_payment uuid, p_at timestamptz) returns void
language plpgsql security definer set search_path = '' as $$
declare s public.trainer_ledger_entries;
begin
  select * into s from public.trainer_ledger_entries x where x.payment_id = p_payment and x.kind = 'sale';
  if not found then return; end if;
  if exists (select 1 from public.trainer_ledger_entries x where x.enrollment_id = s.enrollment_id and x.kind = 'refund') then return; end if;
  insert into public.trainer_ledger_entries
    (trainer_id, course_id, enrollment_id, payment_id, kind, occurred_at, gross, commission_percent, commission, fee, net,
     refund_percent, currency)
  values (s.trainer_id, s.course_id, s.enrollment_id, s.payment_id, 'chargeback', p_at, -s.gross, s.commission_percent,
          -s.commission, 0, -s.net, 100, s.currency)
  on conflict (payment_id) where kind = 'chargeback' do nothing;
end $$;

create or replace function public.ledger_on_payment() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'succeeded' and (tg_op = 'INSERT' or old.status is distinct from 'succeeded') then
    perform public.ledger_record_sale(new.id, now());
  elsif new.status = 'refunded' and tg_op = 'UPDATE' and old.status = 'succeeded' then
    perform public.ledger_record_chargeback(new.id, now());
  end if;
  return null;
end $$;
create trigger payments_trainer_ledger after insert or update of status on public.payments
  for each row execute function public.ledger_on_payment();

create or replace function public.ledger_on_refund() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'approved' and new.cancelled_at is null and (tg_op = 'INSERT' or old.status is distinct from 'approved') then
    perform public.ledger_record_refund(new.id, coalesce(new.decided_at, now()));
  end if;
  return null;
end $$;
create trigger refund_requests_trainer_ledger after insert or update of status on public.refund_requests
  for each row execute function public.ledger_on_refund();

-- Backfill from the rows that already exist (sales first, then refunds, then chargebacks).
do $$
declare x record;
begin
  for x in select id, coalesce(updated_at, created_at) as at from public.payments
           where status in ('succeeded', 'refunded') order by created_at loop
    perform public.ledger_record_sale(x.id, x.at);
  end loop;
  for x in select id, coalesce(decided_at, created_at) as at from public.refund_requests
           where status = 'approved' and cancelled_at is null order by coalesce(decided_at, created_at) loop
    perform public.ledger_record_refund(x.id, x.at);
  end loop;
  for x in select id, coalesce(updated_at, created_at) as at from public.payments where status = 'refunded' order by created_at loop
    perform public.ledger_record_chargeback(x.id, x.at);
  end loop;
end $$;

-- Ledger rows with their release date (Figma «يُفرَج») and settlement month, for one trainer. Internal.
create or replace function public.trainer_ledger_for(p_trainer uuid)
returns table (
  entry_id uuid, kind text, reference text, course_id uuid, course_title text, course_mode public.course_mode,
  course_status public.course_status, course_starts_at timestamptz, course_ends_at timestamptz,
  organization_id uuid, organization_name text, enrollment_id uuid, trainee_name text, occurred_at timestamptz,
  unit_price numeric, gross numeric, commission_percent numeric, commission numeric, fee numeric, net numeric,
  refund_percent numeric, days_before_start integer, release_at timestamptz, projected_release_at timestamptz,
  released boolean, settlement_period date)
language sql stable security definer set search_path = '' as $$
  with base as (
    select l.*, c.title, c.mode, c.status as cstatus, c.starts_at as cstart,
           coalesce(c.ends_at,
                    (select max(s.ends_at) from public.course_sessions s where s.course_id = c.id and s.status <> 'cancelled'),
                    c.starts_at) as cend,
           c.organization_id as org_id, o.name as org_name,
           coalesce(nullif(pr.full_name, ''), 'متدرب') as tname,
           round(en.price_paid - en.vat_amount, 2) as unit,
           sale.occurred_at as sale_at
    from public.trainer_ledger_entries l
    join public.courses c on c.id = l.course_id
    left join public.organizations o on o.id = c.organization_id
    join public.enrollments en on en.id = l.enrollment_id
    left join public.profiles pr on pr.id = en.trainee_id
    left join public.trainer_ledger_entries sale on sale.payment_id = l.payment_id and sale.kind = 'sale'
    where l.trainer_id = p_trainer
  ), rel as (
    select b.*,
           case when b.mode = 'recorded' then b.sale_at + interval '14 days' else b.cend + interval '7 days' end as projected,
           case when b.mode = 'recorded' then b.sale_at + interval '14 days'
                when b.cstatus = 'completed' and b.cend is not null then b.cend + interval '7 days' end as sale_release
    from base b
  ), fin as (
    select r.*,
           case when r.kind = 'sale' then r.sale_release
                when r.sale_release is null then null
                else greatest(r.occurred_at, r.sale_release) end as rel_at
    from rel r
  )
  select f.id, f.kind, f.reference, f.course_id, f.title, f.mode, f.cstatus, f.cstart, f.cend, f.org_id, f.org_name,
         f.enrollment_id, f.tname, f.occurred_at, f.unit, f.gross, f.commission_percent, f.commission, f.fee, f.net,
         f.refund_percent, f.days_before_start, f.rel_at, greatest(f.projected, f.occurred_at),
         coalesce(f.rel_at <= now(), false),
         case when f.rel_at <= now() then (date_trunc('month', f.rel_at at time zone 'Asia/Riyadh'))::date end
  from fin f
  order by f.occurred_at desc, f.id;
$$;

-- TRR-FIN-01/02: the signed-in trainer's ledger.
create or replace function public.trainer_ledger()
returns table (
  entry_id uuid, kind text, reference text, course_id uuid, course_title text, course_mode public.course_mode,
  course_status public.course_status, course_starts_at timestamptz, course_ends_at timestamptz,
  organization_id uuid, organization_name text, enrollment_id uuid, trainee_name text, occurred_at timestamptz,
  unit_price numeric, gross numeric, commission_percent numeric, commission numeric, fee numeric, net numeric,
  refund_percent numeric, days_before_start integer, release_at timestamptz, projected_release_at timestamptz,
  released boolean, settlement_period date)
language sql stable security definer set search_path = '' as $$
  select * from public.trainer_ledger_for(public.require_user());
$$;

-- ── Bank details (TRR-FIN-03) ────────────────────────────────────────────────────────────────────────────────
create table public.trainer_bank_accounts (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.profiles (id),
  iban text not null check (public.is_valid_saudi_iban(iban)),
  iban_last4 text not null check (iban_last4 ~ '^[0-9A-Z]{4}$'),
  bank_code text not null references public.saudi_banks (code),
  bank_name text not null,
  holder_name text not null check (char_length(holder_name) between 2 and 120),
  currency text not null default 'SAR',
  document_path text not null,
  status text not null default 'pending' check (status in ('pending', 'verified', 'rejected', 'cancelled', 'replaced')),
  status_note text check (char_length(status_note) <= 300),
  created_at timestamptz not null default now(),
  verified_at timestamptz,
  decided_at timestamptz,
  cancelled_at timestamptz,
  replaced_at timestamptz
);
create unique index trainer_bank_one_pending on public.trainer_bank_accounts (trainer_id) where status = 'pending';
create unique index trainer_bank_one_verified on public.trainer_bank_accounts (trainer_id) where status = 'verified';
create index trainer_bank_trainer_idx on public.trainer_bank_accounts (trainer_id, created_at desc);
create index trainer_bank_code_idx on public.trainer_bank_accounts (bank_code);

alter table public.trainer_bank_accounts enable row level security;
create policy trainer_bank_read on public.trainer_bank_accounts for select to authenticated
  using (trainer_id = (select auth.uid()) or (select public.is_admin()));
-- The full IBAN and the document path never leave the database through the API: only masked columns are selectable.
revoke all on public.trainer_bank_accounts from anon, authenticated;
grant select (id, trainer_id, iban_last4, bank_code, bank_name, holder_name, currency, status, status_note, created_at,
              verified_at, decided_at, cancelled_at, replaced_at)
  on public.trainer_bank_accounts to authenticated;

-- IBAN certificates: private bucket, "<trainer id>/…", owner (and admins) only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('bank-documents', 'bank-documents', false, 5242880, array['image/jpeg', 'image/png', 'application/pdf'])
on conflict (id) do nothing;
create policy "bank documents insert own" on storage.objects for insert to authenticated
  with check (bucket_id = 'bank-documents' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "bank documents read own" on storage.objects for select to authenticated
  using (bucket_id = 'bank-documents' and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_admin())));

create or replace function public.submit_bank_account(p_iban text, p_bank_code text, p_document_path text)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  u uuid := public.require_user();
  iban text := upper(regexp_replace(coalesce(p_iban, ''), '[^0-9A-Za-z]', '', 'g'));
  b public.saudi_banks;
  holder text;
  cur public.trainer_bank_accounts;
  new_id uuid;
begin
  if not exists (select 1 from public.user_workspaces w where w.user_id = u and w.kind = 'trainer') then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  if not public.is_valid_saudi_iban(iban) then raise exception 'invalid_iban' using errcode = 'P0001'; end if;
  select * into b from public.saudi_banks where code = p_bank_code;
  if not found then raise exception 'invalid_bank' using errcode = 'P0001'; end if;
  if substr(iban, 5, 2) <> b.code then raise exception 'iban_bank_mismatch' using errcode = 'P0001'; end if;
  if p_document_path is null or split_part(p_document_path, '/', 1) <> u::text
     or not exists (select 1 from storage.objects o where o.bucket_id = 'bank-documents' and o.name = p_document_path) then
    raise exception 'document_required' using errcode = 'P0001';
  end if;
  perform pg_advisory_xact_lock(hashtext('trainer_bank:' || u::text));
  if exists (select 1 from public.trainer_bank_accounts x where x.trainer_id = u and x.status = 'pending') then
    raise exception 'bank_change_pending' using errcode = 'P0001';
  end if;
  select * into cur from public.trainer_bank_accounts x where x.trainer_id = u and x.status = 'verified';
  if found and cur.iban = iban then raise exception 'same_bank_account' using errcode = 'P0001'; end if;
  select nullif(trim(full_name), '') into holder from public.profiles where id = u;
  if holder is null or char_length(holder) < 2 then raise exception 'profile_name_required' using errcode = 'P0001'; end if;
  insert into public.trainer_bank_accounts (trainer_id, iban, iban_last4, bank_code, bank_name, holder_name, document_path)
  values (u, iban, right(iban, 4), b.code, b.name, holder, p_document_path)
  returning id into new_id;
  perform public.notify(u, 'bank_account_change', 'طلب تغيير بيانات التحويل',
    b.name || ' · ' || right(iban, 4) || ' — إن لم تكن أنت فألغِ التغيير خلال ٤٨ ساعة.', '/trainer/finance/bank');
  return new_id;
end $$;

-- «يمكنك إلغاء التغيير خلال ٤٨ ساعة».
create or replace function public.cancel_bank_account_change(p_account uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare u uuid := public.require_user(); a public.trainer_bank_accounts;
begin
  select * into a from public.trainer_bank_accounts where id = p_account and trainer_id = u for update;
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
  if a.status <> 'pending' then raise exception 'invalid_state' using errcode = 'P0001'; end if;
  if a.created_at < now() - interval '48 hours' then raise exception 'change_window_closed' using errcode = 'P0001'; end if;
  update public.trainer_bank_accounts set status = 'cancelled', cancelled_at = now() where id = a.id;
end $$;

-- Admin only: verify or reject a submitted account after checking the IBAN certificate against the trainer's name.
create or replace function public.admin_review_bank_account(p_account uuid, p_approve boolean, p_note text default null)
returns void
language plpgsql security definer set search_path = '' as $$
declare u uuid := public.require_user(); a public.trainer_bank_accounts;
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = 'P0001'; end if;
  select * into a from public.trainer_bank_accounts where id = p_account for update;
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
  if a.status <> 'pending' then raise exception 'invalid_state' using errcode = 'P0001'; end if;
  if p_approve then
    update public.trainer_bank_accounts set status = 'replaced', replaced_at = now()
    where trainer_id = a.trainer_id and status = 'verified';
    update public.trainer_bank_accounts set status = 'verified', verified_at = now(), decided_at = now(),
      status_note = nullif(trim(coalesce(p_note, '')), '') where id = a.id;
    perform public.notify(a.trainer_id, 'bank_account_verified', 'وُثِّق حسابك البنكي',
      a.bank_name || ' · ' || a.iban_last4, '/trainer/finance/bank');
  else
    if nullif(trim(coalesce(p_note, '')), '') is null then raise exception 'reason_required' using errcode = 'P0001'; end if;
    update public.trainer_bank_accounts set status = 'rejected', decided_at = now(), status_note = left(trim(p_note), 300)
    where id = a.id;
    perform public.notify(a.trainer_id, 'action_required', 'لم يُوثَّق حسابك البنكي', left(trim(p_note), 200), '/trainer/finance/bank');
  end if;
end $$;

-- ── Withdrawals (TRR-FIN-04) ─────────────────────────────────────────────────────────────────────────────────
create sequence public.trainer_withdrawal_seq;

create table public.trainer_withdrawals (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.profiles (id),
  bank_account_id uuid not null references public.trainer_bank_accounts (id),
  number text not null unique,
  amount numeric(12, 2) not null check (amount > 0),
  fee numeric(12, 2) not null check (fee >= 0),
  net_amount numeric(12, 2) not null,
  currency text not null default 'SAR',
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  failure_reason text check (char_length(failure_reason) <= 200),
  transfer_ref text check (char_length(transfer_ref) <= 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  processing_at timestamptz,
  completed_at timestamptz,
  failed_at timestamptz,
  cancelled_at timestamptz,
  check (net_amount = amount - fee and net_amount > 0),
  check (status <> 'failed' or failure_reason is not null)
);
create unique index trainer_withdrawals_one_in_flight on public.trainer_withdrawals (trainer_id) where status in ('pending', 'processing');
create index trainer_withdrawals_trainer_idx on public.trainer_withdrawals (trainer_id, created_at desc);
create index trainer_withdrawals_bank_idx on public.trainer_withdrawals (bank_account_id);
create trigger trainer_withdrawals_touch before update on public.trainer_withdrawals
  for each row execute function public.touch_updated_at();

alter table public.trainer_withdrawals enable row level security;
create policy trainer_withdrawals_read on public.trainer_withdrawals for select to authenticated
  using (trainer_id = (select auth.uid()) or (select public.is_admin()));
revoke insert, update, delete, truncate on public.trainer_withdrawals from anon, authenticated;
revoke select on public.trainer_withdrawals from anon;

-- Balance for one trainer (internal): the one formula behind «الرصيد المتاح للسحب», «معلّق» and the dashboard card.
create or replace function public.trainer_balance_for(p_trainer uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  with l as (select * from public.trainer_ledger_for(p_trainer)),
  w as (select * from public.trainer_withdrawals where trainer_id = p_trainer)
  select jsonb_build_object(
    'released', coalesce((select sum(net) from l where released), 0),
    'pending', coalesce((select sum(net) from l where not released), 0),
    'withdrawn', coalesce((select sum(amount) from w where status = 'completed'), 0),
    'in_flight', coalesce((select sum(amount) from w where status in ('pending', 'processing')), 0),
    'available', coalesce((select sum(net) from l where released), 0)
                 - coalesce((select sum(amount) from w where status = 'completed'), 0),
    'min_amount', public.setting_numeric('withdrawal_min_amount', 500),
    'fee_amount', public.setting_numeric('withdrawal_fee_amount', 15),
    'commission_percent', public.platform_commission_percent(),
    'refund_fee_percent', public.setting_numeric('refund_processing_fee_percent', 3)
  );
$$;

create or replace function public.trainer_balance() returns jsonb
language sql stable security definer set search_path = '' as $$
  select public.trainer_balance_for(public.require_user());
$$;

create or replace function public.request_withdrawal(p_amount numeric)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  u uuid := public.require_user();
  acct public.trainer_bank_accounts;
  bal jsonb;
  fee numeric;
  new_id uuid;
  num text;
begin
  if not exists (select 1 from public.user_workspaces w where w.user_id = u and w.kind = 'trainer') then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  if p_amount is null or p_amount <= 0 or p_amount <> round(p_amount, 2) then
    raise exception 'invalid_amount' using errcode = 'P0001';
  end if;
  perform pg_advisory_xact_lock(hashtext('trainer_withdrawal:' || u::text));
  select * into acct from public.trainer_bank_accounts x where x.trainer_id = u and x.status = 'verified';
  if not found then raise exception 'bank_account_required' using errcode = 'P0001'; end if;
  if exists (select 1 from public.trainer_bank_accounts x where x.trainer_id = u and x.status = 'pending') then
    raise exception 'bank_change_pending' using errcode = 'P0001';
  end if;
  if acct.created_at > now() - interval '48 hours' then raise exception 'bank_hold_active' using errcode = 'P0001'; end if;
  if exists (select 1 from public.trainer_withdrawals x where x.trainer_id = u and x.status in ('pending', 'processing')) then
    raise exception 'withdrawal_in_progress' using errcode = 'P0001';
  end if;
  bal := public.trainer_balance_for(u);
  if p_amount < (bal ->> 'min_amount')::numeric then raise exception 'withdrawal_below_minimum' using errcode = 'P0001'; end if;
  if p_amount > (bal ->> 'available')::numeric then raise exception 'insufficient_balance' using errcode = 'P0001'; end if;
  fee := (bal ->> 'fee_amount')::numeric;
  if p_amount - fee <= 0 then raise exception 'withdrawal_below_minimum' using errcode = 'P0001'; end if;
  num := 'WDR-' || to_char(now() at time zone 'Asia/Riyadh', 'YYYY') || '-' || lpad(nextval('public.trainer_withdrawal_seq')::text, 4, '0');
  insert into public.trainer_withdrawals (trainer_id, bank_account_id, number, amount, fee, net_amount)
  values (u, acct.id, num, p_amount, fee, p_amount - fee)
  returning id into new_id;
  return new_id;
end $$;

-- «يمكنك إلغاء الطلب ما دام قيد المراجعة المالية».
create or replace function public.cancel_withdrawal(p_withdrawal uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare u uuid := public.require_user(); w public.trainer_withdrawals;
begin
  select * into w from public.trainer_withdrawals where id = p_withdrawal and trainer_id = u for update;
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
  if w.status <> 'pending' then raise exception 'invalid_state' using errcode = 'P0001'; end if;
  update public.trainer_withdrawals set status = 'cancelled', cancelled_at = now() where id = w.id;
end $$;

-- Admin only (finance team, after the manual bank transfer): pending → processing → completed | failed.
-- Completing is the only thing that reduces the trainer's balance; failing leaves it untouched.
create or replace function public.admin_update_withdrawal(p_withdrawal uuid, p_status text, p_reason text default null,
                                                          p_transfer_ref text default null)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  u uuid := public.require_user();
  w public.trainer_withdrawals;
  bal jsonb;
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = 'P0001'; end if;
  select * into w from public.trainer_withdrawals where id = p_withdrawal for update;
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
  perform pg_advisory_xact_lock(hashtext('trainer_withdrawal:' || w.trainer_id::text));
  if p_status = 'processing' then
    if w.status <> 'pending' then raise exception 'invalid_state' using errcode = 'P0001'; end if;
    update public.trainer_withdrawals set status = 'processing', processing_at = now() where id = w.id;
  elsif p_status = 'completed' then
    if w.status not in ('pending', 'processing') then raise exception 'invalid_state' using errcode = 'P0001'; end if;
    if exists (select 1 from public.trainer_bank_accounts x where x.trainer_id = w.trainer_id and x.status = 'pending') then
      raise exception 'bank_change_pending' using errcode = 'P0001';
    end if;
    if not exists (select 1 from public.trainer_bank_accounts x where x.id = w.bank_account_id and x.status = 'verified') then
      raise exception 'bank_account_required' using errcode = 'P0001';
    end if;
    bal := public.trainer_balance_for(w.trainer_id);
    if w.amount > (bal ->> 'available')::numeric then raise exception 'insufficient_balance' using errcode = 'P0001'; end if;
    update public.trainer_withdrawals set status = 'completed', completed_at = now(),
      transfer_ref = nullif(trim(coalesce(p_transfer_ref, '')), '') where id = w.id;
    perform public.notify(w.trainer_id, 'withdrawal_completed', 'تم تحويل طلب السحب',
      w.number || ' · ' || to_char(w.net_amount, 'FM999G999G990D00') || ' ر.س', '/trainer/finance/withdraw?w=' || w.id);
  elsif p_status = 'failed' then
    if w.status not in ('pending', 'processing') then raise exception 'invalid_state' using errcode = 'P0001'; end if;
    if nullif(trim(coalesce(p_reason, '')), '') is null then raise exception 'reason_required' using errcode = 'P0001'; end if;
    update public.trainer_withdrawals set status = 'failed', failed_at = now(), failure_reason = left(trim(p_reason), 200)
    where id = w.id;
    perform public.notify(w.trainer_id, 'action_required', 'تعذّر تنفيذ طلب التحويل',
      w.number || ' · ' || left(trim(p_reason), 150), '/trainer/finance/withdraw?w=' || w.id);
  else
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;
end $$;

-- ── trainer_stats(): money now comes from the ledger (same figures as /trainer/finance) ──────────────────────
create or replace function public.trainer_stats() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  u uuid := public.require_user();
  bal jsonb := public.trainer_balance_for(u);
  month_start timestamptz := date_trunc('month', now() at time zone 'Asia/Riyadh') at time zone 'Asia/Riyadh';
  result jsonb;
begin
  with my_courses as (
    select id from public.courses where trainer_id = u
  ), ledger as (
    select * from public.trainer_ledger_entries l where l.trainer_id = u
  ), active as (
    select e.trainee_id, e.created_at from public.enrollments e
    join my_courses k on k.id = e.course_id
    where e.status in ('confirmed', 'in_progress')
  ), rated as (
    select r.* from public.course_ratings r join my_courses k on k.id = r.course_id
  )
  select jsonb_build_object(
    'commission_percent', public.platform_commission_percent(),
    'available', (bal ->> 'available')::numeric,
    'pending', (bal ->> 'pending')::numeric,
    'month_total', coalesce((select sum(net) from ledger where occurred_at >= month_start), 0),
    'three_month_avg', coalesce((select round(sum(net) / 3, 2) from ledger where occurred_at >= now() - interval '90 days'), 0),
    'first_payment_at', (select min(occurred_at) from ledger where kind = 'sale'),
    'active_trainees', (select count(distinct trainee_id) from active),
    'new_trainees_month', (select count(distinct trainee_id) from active where created_at >= month_start),
    'first_enrollment_at', (select min(e.created_at) from public.enrollments e join my_courses k on k.id = e.course_id
                            where e.status in ('confirmed', 'in_progress', 'completed')),
    'rating_count', (select count(*) from rated),
    'rating_trainer', (select round(avg(trainer_score)::numeric, 1) from rated),
    'rating_content', (select round(avg(content_score)::numeric, 1) from rated),
    'rating_organization', (select round(avg(organization_score)::numeric, 1) from rated),
    'low_ratings', (select count(*) from rated where trainer_score <= 3 and created_at > now() - interval '30 days'),
    'platform_rating_avg', (select round(avg(trainer_score)::numeric, 1) from public.course_ratings),
    'bank_status', (select case when bool_or(status = 'verified') then 'verified' when bool_or(status = 'pending') then 'pending' end
                    from public.trainer_bank_accounts where trainer_id = u)
  ) into result;
  return result;
end $$;

-- ── Privileges ─────────────────────────────────────────────────────────────────────────────────────────────────
revoke all on function public.setting_numeric(text, numeric) from public, anon, authenticated;
revoke all on function public.is_valid_saudi_iban(text) from public, anon;
revoke all on function public.ledger_record_sale(uuid, timestamptz) from public, anon, authenticated;
revoke all on function public.ledger_record_refund(uuid, timestamptz) from public, anon, authenticated;
revoke all on function public.ledger_record_chargeback(uuid, timestamptz) from public, anon, authenticated;
revoke all on function public.ledger_on_payment() from public, anon, authenticated;
revoke all on function public.ledger_on_refund() from public, anon, authenticated;
revoke all on function public.trainer_ledger_for(uuid) from public, anon, authenticated;
revoke all on function public.trainer_balance_for(uuid) from public, anon, authenticated;
revoke all on function public.trainer_ledger() from public, anon;
revoke all on function public.trainer_balance() from public, anon;
revoke all on function public.submit_bank_account(text, text, text) from public, anon;
revoke all on function public.cancel_bank_account_change(uuid) from public, anon;
revoke all on function public.admin_review_bank_account(uuid, boolean, text) from public, anon;
revoke all on function public.request_withdrawal(numeric) from public, anon;
revoke all on function public.cancel_withdrawal(uuid) from public, anon;
revoke all on function public.admin_update_withdrawal(uuid, text, text, text) from public, anon;
revoke all on function public.trainer_stats() from public, anon;
revoke all on sequence public.trainer_refund_ref_seq from public, anon, authenticated;
revoke all on sequence public.trainer_withdrawal_seq from public, anon, authenticated;
revoke all on public.saudi_banks from anon;
revoke insert, update, delete, truncate on public.saudi_banks from authenticated;

grant execute on function
  public.is_valid_saudi_iban(text),
  public.trainer_ledger(),
  public.trainer_balance(),
  public.submit_bank_account(text, text, text),
  public.cancel_bank_account_change(uuid),
  public.admin_review_bank_account(uuid, boolean, text),
  public.request_withdrawal(numeric),
  public.cancel_withdrawal(uuid),
  public.admin_update_withdrawal(uuid, text, text, text),
  public.trainer_stats()
to authenticated;
