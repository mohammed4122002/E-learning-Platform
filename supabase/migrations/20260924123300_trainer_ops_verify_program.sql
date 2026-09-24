-- TRR-CRT-02 (4256:*): program completion certificates are «قابلة للتحقق» like course certificates.
-- Same signature and columns as before; program certificates are appended (no trainer, no hours, never revoked here).
create or replace function public.verify_certificate(p_code text)
returns table (code text, status public.certificate_status, trainee_name text, course_title text, hours numeric,
               issued_at timestamptz, revoked_at timestamptz, issuer_name text, trainer_name text)
language sql stable security definer set search_path = '' as $$
  select x.code, x.status, x.trainee_name, x.course_title, x.hours, x.issued_at, x.revoked_at,
         o.name, t.full_name
  from public.certificates x
  left join public.organizations o on o.id = x.issuer_organization_id
  join public.profiles t on t.id = x.trainer_id
  where x.code = upper(trim(p_code)) and upper(trim(p_code)) ~ '^[0-9A-F]{12}$'
  union all
  select g.code, g.status, g.trainee_name, g.program_title, null::numeric, g.issued_at, null::timestamptz,
         o.name, null::text
  from public.program_certificates g
  left join public.organizations o on o.id = g.issuer_organization_id
  where g.code = upper(trim(p_code)) and upper(trim(p_code)) ~ '^[0-9A-F]{12}$';
$$;
