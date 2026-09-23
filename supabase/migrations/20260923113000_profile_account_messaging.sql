-- Profile, identity verification, account settings, notifications center and messaging
-- (TRN-PRF-*, TRN-VER-*, GEN-ACC-01, GEN-NOT-01, GEN-MSG-*).

-- ── GEN-ACC-01 · ١ الحساب واللغة ────────────────────────────────────────────
alter table public.account_settings
  add column if not exists timezone text not null default 'Asia/Riyadh' check (char_length(timezone) <= 64),
  add column if not exists arabic_digits boolean not null default true;

-- ── GEN-NOT-01 · Selection → أرشفة ─────────────────────────────────────────
alter table public.notifications add column if not exists archived_at timestamptz;

-- ── GEN-MSG-02 · كتم هذه المحادثة ──────────────────────────────────────────
alter table public.conversation_participants add column if not exists muted_at timestamptz;

-- ── TRN-VER-01 · the ID card has two faces (front + back) ──────────────────
alter table public.identity_verifications add column if not exists document_back_path text;

-- ── BR-S3 · a deletion request freezes the account; staff purge it later ──
alter table public.profiles add column if not exists deletion_requested_at timestamptz;

create or replace function public.protect_profile_fields() returns trigger
language plpgsql set search_path = '' as $$
begin
  if auth.uid() is not null and not public.is_admin()
     and coalesce(current_setting('app.trusted_op', true), '') <> 'on' then
    new.identity_status := old.identity_status;
    new.frozen_at := old.frozen_at;
    new.deletion_requested_at := old.deletion_requested_at;
  end if;
  return new;
end $$;
revoke execute on function public.protect_profile_fields() from public, anon, authenticated;

-- TRN-VER-01: document front (required) + back (optional). Same rules as submit_identity_verification.
create or replace function public.submit_identity_documents(p_type text, p_last4 text, p_front_path text, p_back_path text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare u uuid := public.require_user(); vid uuid;
begin
  if p_type not in ('national_id', 'iqama', 'passport') or coalesce(p_front_path, '') = ''
     or (p_last4 is not null and upper(p_last4) !~ '^[0-9A-Z]{4}$') then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.identity_verifications v where v.user_id = u and v.status in ('pending', 'verified')) then
    raise exception 'verification_exists' using errcode = 'P0001';
  end if;
  if split_part(p_front_path, '/', 1) <> u::text or (p_back_path is not null and split_part(p_back_path, '/', 1) <> u::text) then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  insert into public.identity_verifications (user_id, document_type, document_number_last4, document_path, document_back_path)
  values (u, p_type, upper(p_last4), p_front_path, p_back_path) returning id into vid;
  perform set_config('app.trusted_op', 'on', true);
  update public.profiles set identity_status = 'pending' where id = u;
  return vid;
end $$;
revoke execute on function public.submit_identity_documents(text, text, text, text) from public, anon, authenticated;
grant execute on function public.submit_identity_documents(text, text, text, text) to authenticated;

-- GEN-ACC-01 · ٤ حذف الحساب (BR-S3): blocked by commitments; otherwise freeze now and flag for deletion.
create or replace function public.request_account_deletion() returns void
language plpgsql security definer set search_path = '' as $$
declare u uuid := public.require_user();
begin
  if exists (select 1 from public.account_deletion_blockers()) then
    raise exception 'account_has_commitments' using errcode = 'P0001';
  end if;
  perform set_config('app.trusted_op', 'on', true);
  update public.profiles set frozen_at = now(), is_public = false, deletion_requested_at = now() where id = u;
end $$;
revoke execute on function public.request_account_deletion() from public, anon, authenticated;
grant execute on function public.request_account_deletion() to authenticated;

-- TRN-PRF-01 · الملف العام (/u/[id]): only what the owner chose to share. Private account data never leaves.
-- Anonymous visitors cannot read account_settings or certificates, so the public view is assembled here.
create or replace function public.public_profile(p_user uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare p public.profiles; s public.account_settings; me uuid := auth.uid();
begin
  select * into p from public.profiles where id = p_user;
  if not found or p.frozen_at is not null or (not p.is_public and p.id is distinct from me) then
    return null;
  end if;
  select * into s from public.account_settings where user_id = p_user;
  return jsonb_build_object(
    'id', p.id,
    'full_name', p.full_name,
    'avatar_path', p.avatar_path,
    'headline', p.headline,
    'bio', p.bio,
    'city', p.city,
    'is_public', p.is_public,
    'member_since', p.created_at,
    'verified', p.identity_status = 'verified',
    'show_certificates', coalesce(s.show_certificates, true),
    'show_learning_record', coalesce(s.show_learning_record, true),
    'experiences', coalesce((
      select jsonb_agg(jsonb_build_object('title', e.title, 'organization', e.organization, 'start_date', e.start_date,
                                          'end_date', e.end_date, 'is_current', e.is_current)
                       order by e.is_current desc, e.start_date desc)
      from public.experiences e where e.user_id = p.id), '[]'::jsonb),
    'certificates', case when coalesce(s.show_certificates, true) then coalesce((
      select jsonb_agg(jsonb_build_object('code', c.code, 'course_title', c.course_title, 'trainee_name', c.trainee_name,
                                          'issued_at', c.issued_at, 'hours', c.hours, 'issuer', o.name)
                       order by c.issued_at desc)
      from public.certificates c left join public.organizations o on o.id = c.issuer_organization_id
      where c.trainee_id = p.id and c.status = 'issued'), '[]'::jsonb) else '[]'::jsonb end,
    'certificate_count', case when coalesce(s.show_certificates, true)
      then (select count(*) from public.certificates c where c.trainee_id = p.id and c.status = 'issued') else null end,
    'hours', case when coalesce(s.show_learning_record, true)
      then (select coalesce(sum(c.hours), 0) from public.certificates c where c.trainee_id = p.id and c.status = 'issued') else null end,
    'skills', case when coalesce(s.show_learning_record, true) then coalesce((
      select jsonb_agg(distinct g.name)
      from public.enrollments en join public.courses k on k.id = en.course_id
      join public.programs pr on pr.id = k.program_id join public.categories g on g.id = pr.category_id
      where en.trainee_id = p.id and en.status = 'completed'), '[]'::jsonb) else '[]'::jsonb end
  );
end $$;
revoke execute on function public.public_profile(uuid) from public, anon, authenticated;
grant execute on function public.public_profile(uuid) to anon, authenticated;

-- ── GEN-MSG-02 · المرفقات: "<conversation_id>/<uuid>-<file>", readable by the conversation's members ──
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('message-attachments', 'message-attachments', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
on conflict (id) do nothing;

create or replace function public.is_conversation_folder(object_name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select case when (storage.foldername(object_name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
              then public.is_conversation_member(((storage.foldername(object_name))[1])::uuid)
              else false end;
$$;
revoke execute on function public.is_conversation_folder(text) from public, anon, authenticated;
grant execute on function public.is_conversation_folder(text) to authenticated;

create policy "message attachments insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'message-attachments' and public.is_conversation_folder(name));
create policy "message attachments read" on storage.objects for select to authenticated
  using (bucket_id = 'message-attachments' and public.is_conversation_folder(name));
