-- TRR-CTR-01/02/03 · Trainer contracts with an organization.
-- Source: an affiliation or an accepted bid (source_type + source_id, no FK to bids — bids are built separately).
-- Contract versions are immutable once sent. E-signature is a platform click-to-sign record (no third-party
-- e-sign provider): typed name + explicit consent + timestamp + SHA-256 of IP and user agent + SHA-256 of the
-- canonical terms (jsonb text) of the signed version. Signatures are insert-only.

create sequence public.trainer_contract_number_seq;

create table public.trainer_contracts (
  id uuid primary key default gen_random_uuid(),
  number text not null unique default ('CTR-' || to_char(now() at time zone 'Asia/Riyadh', 'YYYY') || '-' || lpad(nextval('public.trainer_contract_number_seq')::text, 6, '0')),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  trainer_id uuid not null references public.profiles (id) on delete restrict,
  source_type text not null check (source_type in ('affiliation', 'bid')),
  source_id uuid not null,
  source_ref text check (char_length(source_ref) <= 40),
  title text not null check (char_length(title) between 2 and 200),
  status text not null default 'draft' check (status in ('draft', 'sent', 'signed_by_trainer', 'active', 'terminated', 'expired')),
  current_version int not null default 0,
  sign_deadline timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz,
  trainer_signed_at timestamptz,
  activated_at timestamptz,
  terminated_at timestamptz,
  terminated_by uuid references public.profiles (id) on delete set null,
  termination_reason text check (char_length(termination_reason) <= 2000),
  expired_at timestamptz
);
create index trainer_contracts_trainer_idx on public.trainer_contracts (trainer_id, status);
create index trainer_contracts_org_idx on public.trainer_contracts (organization_id, status);
create index trainer_contracts_created_by_idx on public.trainer_contracts (created_by);
create index trainer_contracts_terminated_by_idx on public.trainer_contracts (terminated_by);
-- One live contract per source.
create unique index trainer_contracts_one_live_per_source on public.trainer_contracts (source_type, source_id)
  where status in ('draft', 'sent', 'signed_by_trainer', 'active');
create trigger trainer_contracts_touch before update on public.trainer_contracts
  for each row execute function public.touch_updated_at();

create table public.trainer_contract_versions (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.trainer_contracts (id) on delete cascade,
  version int not null check (version >= 1),
  terms jsonb not null check (jsonb_typeof(terms) = 'object'),
  document_hash text not null check (document_hash ~ '^[0-9a-f]{64}$'),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  unique (contract_id, version)
);
create index trainer_contract_versions_created_by_idx on public.trainer_contract_versions (created_by);

create table public.trainer_contract_signatures (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.trainer_contracts (id) on delete cascade,
  version_id uuid not null references public.trainer_contract_versions (id) on delete cascade,
  party text not null check (party in ('trainer', 'organization')),
  signer_id uuid not null references public.profiles (id) on delete restrict,
  typed_name text not null check (char_length(typed_name) between 2 and 160),
  consent_text text not null,
  consented boolean not null check (consented),
  document_hash text not null check (document_hash ~ '^[0-9a-f]{64}$'),
  ip_hash text check (ip_hash ~ '^[0-9a-f]{64}$'),
  user_agent_hash text check (user_agent_hash ~ '^[0-9a-f]{64}$'),
  signed_at timestamptz not null default now(),
  unique (version_id, party)
);
create index trainer_contract_signatures_contract_idx on public.trainer_contract_signatures (contract_id);
create index trainer_contract_signatures_signer_idx on public.trainer_contract_signatures (signer_id);

-- ── Immutability ─────────────────────────────────────────────────────────────
create or replace function public.contract_hash(p_terms jsonb) returns text
language sql immutable set search_path = '' as $$
  select encode(sha256(convert_to(p_terms::text, 'UTF8')), 'hex');
$$;

create or replace function public.guard_contract_version() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    if old.sent_at is not null then raise exception 'contract_version_locked' using errcode = 'P0001'; end if;
    return old;
  end if;
  if old.sent_at is not null then raise exception 'contract_version_locked' using errcode = 'P0001'; end if;
  if new.terms is distinct from old.terms then new.document_hash := public.contract_hash(new.terms); end if;
  new.contract_id := old.contract_id; new.version := old.version;
  return new;
end $$;
create trigger trainer_contract_versions_guard before update or delete on public.trainer_contract_versions
  for each row execute function public.guard_contract_version();

create or replace function public.guard_contract_signature() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'signature_immutable' using errcode = 'P0001';
end $$;
create trigger trainer_contract_signatures_immutable before update or delete on public.trainer_contract_signatures
  for each row execute function public.guard_contract_signature();

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table public.trainer_contracts enable row level security;
alter table public.trainer_contract_versions enable row level security;
alter table public.trainer_contract_signatures enable row level security;

-- The trainer never sees drafts the organization is still preparing.
create policy trainer_contracts_read on public.trainer_contracts for select to authenticated
  using ((trainer_id = (select auth.uid()) and status <> 'draft') or public.is_org_member(organization_id) or public.is_admin());
create policy trainer_contract_versions_read on public.trainer_contract_versions for select to authenticated
  using (exists (select 1 from public.trainer_contracts c where c.id = contract_id
                 and ((c.trainer_id = (select auth.uid()) and sent_at is not null) or public.is_org_member(c.organization_id) or public.is_admin())));
create policy trainer_contract_signatures_read on public.trainer_contract_signatures for select to authenticated
  using (exists (select 1 from public.trainer_contracts c where c.id = contract_id
                 and (c.trainer_id = (select auth.uid()) or public.is_org_member(c.organization_id) or public.is_admin())));

-- ── Housekeeping ─────────────────────────────────────────────────────────────
create or replace function public.contracts_housekeeping() returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.trainer_contracts set status = 'expired', expired_at = now()
  where status in ('sent', 'signed_by_trainer') and sign_deadline is not null and sign_deadline <= now();
end $$;

-- ── Internal: create a contract with its first version ──────────────────────
create or replace function public.create_contract_internal(
  p_org uuid, p_trainer uuid, p_source_type text, p_source_id uuid, p_source_ref text, p_title text, p_terms jsonb,
  p_send boolean, p_sign_days int, p_creator uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare cid uuid;
begin
  if p_terms is null or jsonb_typeof(p_terms) <> 'object' then raise exception 'invalid_input' using errcode = 'P0001'; end if;
  if exists (select 1 from public.trainer_contracts c where c.source_type = p_source_type and c.source_id = p_source_id
             and c.status in ('draft', 'sent', 'signed_by_trainer', 'active')) then
    raise exception 'contract_exists' using errcode = 'P0001';
  end if;
  insert into public.trainer_contracts (organization_id, trainer_id, source_type, source_id, source_ref, title, status, current_version,
                                        sign_deadline, created_by, sent_at)
  values (p_org, p_trainer, p_source_type, p_source_id, nullif(trim(coalesce(p_source_ref, '')), ''), trim(p_title),
          case when p_send then 'sent' else 'draft' end, 1,
          case when p_send then now() + make_interval(days => greatest(1, coalesce(p_sign_days, 5))) end,
          p_creator, case when p_send then now() end)
  returning id into cid;
  insert into public.trainer_contract_versions (contract_id, version, terms, document_hash, created_by, sent_at)
  values (cid, 1, p_terms, public.contract_hash(p_terms), p_creator, case when p_send then now() end);
  return cid;
end $$;

-- ── Organization RPCs ────────────────────────────────────────────────────────
-- Contract from an active affiliation (draft; the organization sends it with org_send_contract).
create or replace function public.org_create_affiliation_contract(p_affiliation uuid, p_title text, p_source_ref text, p_terms jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare u uuid := public.require_user(); a public.trainer_affiliations;
begin
  select * into a from public.trainer_affiliations where id = p_affiliation;
  if not found or not public.is_org_manager(a.organization_id) then raise exception 'not_found' using errcode = 'P0001'; end if;
  if a.status <> 'active' then raise exception 'affiliation_not_active' using errcode = 'P0001'; end if;
  if char_length(trim(coalesce(p_title, ''))) < 2 then raise exception 'invalid_input' using errcode = 'P0001'; end if;
  return public.create_contract_internal(a.organization_id, a.trainer_id, 'affiliation', a.id, p_source_ref, p_title, p_terms, false, null, u);
end $$;

-- Replace the terms of a draft (new version while nothing has been sent; sent versions stay immutable).
create or replace function public.org_revise_contract(p_contract uuid, p_terms jsonb) returns int
language plpgsql security definer set search_path = '' as $$
declare u uuid := public.require_user(); c public.trainer_contracts; v int;
begin
  select * into c from public.trainer_contracts where id = p_contract for update;
  if not found or not public.is_org_manager(c.organization_id) then raise exception 'not_found' using errcode = 'P0001'; end if;
  if c.status not in ('draft', 'sent') then raise exception 'contract_locked' using errcode = 'P0001'; end if;
  if p_terms is null or jsonb_typeof(p_terms) <> 'object' then raise exception 'invalid_input' using errcode = 'P0001'; end if;
  v := c.current_version + 1;
  insert into public.trainer_contract_versions (contract_id, version, terms, document_hash, created_by, sent_at)
  values (c.id, v, p_terms, public.contract_hash(p_terms), u, case when c.status = 'sent' then now() end);
  update public.trainer_contracts set current_version = v where id = c.id;
  if c.status = 'sent' then
    perform public.notify(c.trainer_id, 'contract', 'نسخة معدّلة من العقد', 'أرسلت الجهة نسخة معدّلة من العقد ' || c.number || '. راجعها قبل التوقيع.',
                          '/trainer/contracts/' || c.id);
  end if;
  return v;
end $$;

create or replace function public.org_send_contract(p_contract uuid, p_sign_days int default 5) returns void
language plpgsql security definer set search_path = '' as $$
declare c public.trainer_contracts; org_name text;
begin
  perform public.require_user();
  select * into c from public.trainer_contracts where id = p_contract for update;
  if not found or not public.is_org_manager(c.organization_id) then raise exception 'not_found' using errcode = 'P0001'; end if;
  if c.status <> 'draft' then raise exception 'contract_not_draft' using errcode = 'P0001'; end if;
  update public.trainer_contract_versions set sent_at = now() where contract_id = c.id and version = c.current_version;
  update public.trainer_contracts
  set status = 'sent', sent_at = now(), sign_deadline = now() + make_interval(days => greatest(1, coalesce(p_sign_days, 5)))
  where id = c.id;
  select o.name into org_name from public.organizations o where o.id = c.organization_id;
  perform public.notify(c.trainer_id, 'contract', 'عقد جديد بانتظار توقيعك', org_name || ' أرسلت العقد ' || c.number || ' لمراجعتك وتوقيعك.',
                        '/trainer/contracts/' || c.id);
end $$;

create or replace function public.sign_contract_internal(
  c public.trainer_contracts, p_party text, p_signer uuid, p_typed_name text, p_consent boolean, p_ip_hash text, p_ua_hash text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v public.trainer_contract_versions; sid uuid;
begin
  if not coalesce(p_consent, false) then raise exception 'consent_required' using errcode = 'P0001'; end if;
  if char_length(trim(coalesce(p_typed_name, ''))) < 2 then raise exception 'signature_name_required' using errcode = 'P0001'; end if;
  select * into v from public.trainer_contract_versions where contract_id = c.id and version = c.current_version;
  if v.sent_at is null then raise exception 'contract_not_sent' using errcode = 'P0001'; end if;
  insert into public.trainer_contract_signatures (contract_id, version_id, party, signer_id, typed_name, consent_text, consented,
                                                  document_hash, ip_hash, user_agent_hash)
  values (c.id, v.id, p_party, p_signer, trim(p_typed_name), 'راجعتُ العقد وأوافق على شروطه', true, v.document_hash,
          nullif(lower(p_ip_hash), ''), nullif(lower(p_ua_hash), ''))
  returning id into sid;
  return sid;
end $$;

-- Countersignature by the organization → the contract becomes active.
create or replace function public.org_countersign_contract(p_contract uuid, p_typed_name text, p_consent boolean, p_ip_hash text, p_ua_hash text)
returns void language plpgsql security definer set search_path = '' as $$
declare u uuid := public.require_user(); c public.trainer_contracts; org_name text;
begin
  perform public.contracts_housekeeping();
  select * into c from public.trainer_contracts where id = p_contract for update;
  if not found or not public.is_org_manager(c.organization_id) then raise exception 'not_found' using errcode = 'P0001'; end if;
  if c.status = 'expired' then raise exception 'contract_expired' using errcode = 'P0001'; end if;
  if c.status <> 'signed_by_trainer' then raise exception 'contract_not_signed_by_trainer' using errcode = 'P0001'; end if;
  perform public.sign_contract_internal(c, 'organization', u, p_typed_name, p_consent, p_ip_hash, p_ua_hash);
  update public.trainer_contracts set status = 'active', activated_at = now() where id = c.id;
  select o.name into org_name from public.organizations o where o.id = c.organization_id;
  perform public.notify(c.trainer_id, 'contract', 'العقد نافذ', 'وقّعت ' || org_name || ' العقد ' || c.number || ' — العقد نافذ الآن.',
                        '/trainer/contracts/' || c.id);
end $$;

create or replace function public.org_terminate_contract(p_contract uuid, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare u uuid := public.require_user(); c public.trainer_contracts; org_name text;
begin
  select * into c from public.trainer_contracts where id = p_contract for update;
  if not found or not public.is_org_manager(c.organization_id) then raise exception 'not_found' using errcode = 'P0001'; end if;
  if c.status in ('terminated', 'expired') then raise exception 'contract_locked' using errcode = 'P0001'; end if;
  if char_length(trim(coalesce(p_reason, ''))) < 5 then raise exception 'reason_required' using errcode = 'P0001'; end if;
  update public.trainer_contracts set status = 'terminated', terminated_at = now(), terminated_by = u, termination_reason = trim(p_reason) where id = c.id;
  if c.status <> 'draft' then
    select o.name into org_name from public.organizations o where o.id = c.organization_id;
    perform public.notify(c.trainer_id, 'contract', 'أُنهي العقد', org_name || ' أنهت العقد ' || c.number || '.', '/trainer/contracts/' || c.id);
  end if;
end $$;

-- ── Trainer RPCs ─────────────────────────────────────────────────────────────
-- «وقّع وأرسل». The typed name must match the name on the trainer's profile (spaces and the «م.» title ignored).
create or replace function public.sign_contract(p_contract uuid, p_version int, p_typed_name text, p_consent boolean, p_ip_hash text, p_ua_hash text)
returns void language plpgsql security definer set search_path = '' as $$
declare u uuid := public.require_user(); c public.trainer_contracts; full_name text; norm_typed text; norm_name text; trainer_name text;
begin
  perform public.contracts_housekeeping();
  select * into c from public.trainer_contracts where id = p_contract and trainer_id = u for update;
  if not found or c.status = 'draft' then raise exception 'not_found' using errcode = 'P0001'; end if;
  if c.status = 'expired' then raise exception 'contract_expired' using errcode = 'P0001'; end if;
  if c.status <> 'sent' then raise exception 'contract_already_signed' using errcode = 'P0001'; end if;
  if p_version is distinct from c.current_version then raise exception 'contract_version_changed' using errcode = 'P0001'; end if;
  select p.full_name into full_name from public.profiles p where p.id = u;
  norm_typed := regexp_replace(regexp_replace(trim(coalesce(p_typed_name, '')), '^(م|د|أ)\.\s*', ''), '\s+', ' ', 'g');
  norm_name := regexp_replace(regexp_replace(trim(coalesce(full_name, '')), '^(م|د|أ)\.\s*', ''), '\s+', ' ', 'g');
  if norm_typed = '' then raise exception 'signature_name_required' using errcode = 'P0001'; end if;
  if norm_typed <> norm_name then raise exception 'signature_name_mismatch' using errcode = 'P0001'; end if;
  perform public.sign_contract_internal(c, 'trainer', u, p_typed_name, p_consent, p_ip_hash, p_ua_hash);
  update public.trainer_contracts set status = 'signed_by_trainer', trainer_signed_at = now() where id = c.id;
  select p.full_name into trainer_name from public.profiles p where p.id = u;
  perform public.notify_org_managers(c.organization_id, 'contract', 'وقّع المدرب العقد',
    coalesce(trainer_name, 'المدرب') || ' وقّع العقد ' || c.number || '. بانتظار توقيعكم ليصبح نافذًا.', null);
end $$;

-- /trainer/contracts/new?source=bid&id=<bidId>. Bids are built separately: when `public.bid_contract_terms(uuid)`
-- exists it must return (organization_id, trainer_id, title, source_ref, terms) for an accepted bid of the caller
-- and raise P0001 otherwise. The contract is issued for signature straight away (the terms were agreed in the bid).
create or replace function public.start_bid_contract(p_bid uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare u uuid := public.require_user(); r record; existing uuid;
begin
  select c.id into existing from public.trainer_contracts c
  where c.source_type = 'bid' and c.source_id = p_bid and c.trainer_id = u and c.status in ('sent', 'signed_by_trainer', 'active');
  if existing is not null then return existing; end if;
  if to_regclass('public.bids') is null or to_regprocedure('public.bid_contract_terms(uuid)') is null then
    raise exception 'bids_unavailable' using errcode = 'P0001';
  end if;
  execute 'select * from public.bid_contract_terms($1)' into r using p_bid;
  if r is null or r.trainer_id is distinct from u then raise exception 'not_found' using errcode = 'P0001'; end if;
  return public.create_contract_internal(r.organization_id, u, 'bid', p_bid, r.source_ref, r.title, r.terms, true, 5, u);
end $$;

-- ── Jobs & privileges ───────────────────────────────────────────────────────
select cron.schedule('contracts-housekeeping', '*/15 * * * *', $$select public.contracts_housekeeping()$$);

revoke execute on function
  public.contract_hash(jsonb), public.guard_contract_version(), public.guard_contract_signature(), public.contracts_housekeeping(),
  public.create_contract_internal(uuid, uuid, text, uuid, text, text, jsonb, boolean, int, uuid),
  public.org_create_affiliation_contract(uuid, text, text, jsonb), public.org_revise_contract(uuid, jsonb),
  public.org_send_contract(uuid, int), public.sign_contract_internal(public.trainer_contracts, text, uuid, text, boolean, text, text),
  public.org_countersign_contract(uuid, text, boolean, text, text), public.org_terminate_contract(uuid, text),
  public.sign_contract(uuid, int, text, boolean, text, text), public.start_bid_contract(uuid)
from public, anon, authenticated;
grant execute on function
  public.contracts_housekeeping(),
  public.org_create_affiliation_contract(uuid, text, text, jsonb), public.org_revise_contract(uuid, jsonb),
  public.org_send_contract(uuid, int), public.org_countersign_contract(uuid, text, boolean, text, text), public.org_terminate_contract(uuid, text),
  public.sign_contract(uuid, int, text, boolean, text, text), public.start_bid_contract(uuid)
to authenticated;
