-- TRN-ONB-01 · التخصيص: learning fields (المجالات), goals, experience level and professional data as designed.

create table public.learning_fields (
  slug text primary key,
  name text not null,
  icon text not null,
  position int not null
);
alter table public.learning_fields enable row level security;
create policy learning_fields_read on public.learning_fields for select using (true);

insert into public.learning_fields (slug, name, icon, position) values
  ('management', 'الإدارة والقيادة', 'briefcase', 1),
  ('technology', 'التقنية والبرمجة', 'monitor', 2),
  ('marketing', 'التسويق والمبيعات', 'trending-up', 3),
  ('design', 'التصميم والإبداع', 'palette', 4),
  ('finance', 'المال والأعمال', 'coins', 5),
  ('hr', 'الموارد البشرية', 'users', 6),
  ('soft-skills', 'المهارات الشخصية', 'brain', 7),
  ('other', 'مجالات أخرى', 'layout-grid', 8);

alter table public.categories add column field_slug text references public.learning_fields (slug) on delete set null;
update public.categories set field_slug = case slug
  when 'business' then 'management' when 'leadership' then 'management'
  when 'programming' then 'technology' when 'data' then 'technology'
  when 'finance' then 'finance' when 'design' then 'design'
  when 'hr' then 'hr' when 'marketing' then 'marketing' else 'other' end;

alter table public.trainee_preferences
  add column field_slugs text[] not null default '{}',
  add column experience_level text check (experience_level in ('none', 'basic', 'intermediate', 'advanced')),
  add column experience_years text check (experience_years in ('lt1', '1to3', '3to5', '5to10', 'gt10')),
  add column skills text[] not null default '{}' check (cardinality(skills) <= 20),
  add column step int not null default 1 check (step between 1 and 7);

alter table public.trainee_preferences drop constraint trainee_preferences_goal_check;
alter table public.trainee_preferences add constraint trainee_preferences_goal_check
  check (goal in ('career_growth', 'certificate', 'career_change', 'work_skills', 'entrepreneurship', 'hobby'));
