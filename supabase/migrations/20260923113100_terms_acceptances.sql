-- GEN-TRM-01 · عرض الشروط والموافقة: "موافقتك تُسجَّل برقم النسخة والختم الزمني".
create table if not exists public.terms_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  version text not null check (version ~ '^[0-9]+\.[0-9]+$'),
  accepted_at timestamptz not null default now(),
  unique (user_id, version)
);
alter table public.terms_acceptances enable row level security;
create policy terms_acceptances_read_own on public.terms_acceptances for select using (user_id = auth.uid() or public.is_admin());
create policy terms_acceptances_insert_own on public.terms_acceptances for insert with check (user_id = auth.uid());
