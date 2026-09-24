-- Evaluate the lesson-media check only for that bucket (CASE fixes the evaluation order, so folder names of
-- other buckets are never cast to uuid).
drop policy if exists "lesson media published only" on storage.objects;
create policy "lesson media published only" on storage.objects as restrictive for select to anon, authenticated
  using (
    case when bucket_id <> 'lesson-media' then true
    else public.is_admin()
      or public.manages_course(((storage.foldername(name))[1])::uuid)
      or exists (
        select 1 from public.lessons l join public.courses c on c.id = l.course_id
        where l.media_path = storage.objects.name and l.published_at is not null and c.status <> 'draft')
      or exists (
        select 1 from public.course_files f join public.courses c on c.id = f.course_id
        where f.file_path = storage.objects.name and f.published_at is not null and c.status <> 'draft')
    end
  );
