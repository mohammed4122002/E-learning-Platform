-- TRR-PRF-02 «من يرى ماذا؟»: per-section visibility of the trainer's public profile. Additive column.
-- Levels: public (أي زائر) · orgs (الجهات التدريبية فقط) · private (لا يراه أحد). Ratings are always public and
-- prices / contact details always private, so they are not stored here.
create or replace function public.valid_trainer_visibility(v jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select jsonb_typeof(v) = 'object'
     and not exists (
       select 1 from jsonb_each_text(v) e
       where e.key not in ('profile', 'credentials', 'experience', 'availability', 'trainees')
          or e.value not in ('public', 'orgs', 'private')
     );
$$;

alter table public.trainer_profiles add column if not exists visibility jsonb not null
  default '{"profile":"public","credentials":"public","experience":"public","availability":"orgs","trainees":"orgs"}'::jsonb
  check (public.valid_trainer_visibility(visibility));
