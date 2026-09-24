-- Unpublished content stays with the course staff (TRR-CRS-08 / BR-L10): draft lessons of a published course,
-- every lesson of a draft course, and their media are not readable by enrolled trainees or visitors.
-- Restrictive policies narrow the existing permissive ones without replacing them.

create policy lessons_published_only on public.lessons as restrictive for select
  using (
    public.manages_course(course_id) or public.is_admin()
    or (published_at is not null
        and exists (select 1 from public.courses c where c.id = course_id and c.status <> 'draft'))
  );

create policy course_files_published_only on public.course_files as restrictive for select
  using (public.manages_course(course_id) or public.is_admin() or published_at is not null);

-- lesson-media objects: staff see everything under their course folder; anyone else only objects attached to
-- a published lesson (or published course file) of a published course. Other buckets are unaffected.
create policy "lesson media published only" on storage.objects as restrictive for select to anon, authenticated
  using (
    bucket_id <> 'lesson-media'
    or public.is_admin()
    or public.manages_course(((storage.foldername(name))[1])::uuid)
    or exists (
      select 1 from public.lessons l join public.courses c on c.id = l.course_id
      where l.media_path = storage.objects.name and l.published_at is not null and c.status <> 'draft')
    or exists (
      select 1 from public.course_files f join public.courses c on c.id = f.course_id
      where f.file_path = storage.objects.name and f.published_at is not null and c.status <> 'draft')
  );
