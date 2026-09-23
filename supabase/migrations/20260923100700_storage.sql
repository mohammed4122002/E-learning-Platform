-- Storage buckets. Private buckets store user files under "<auth.uid()>/…"; reads use signed URLs.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp']),
  ('course-covers', 'course-covers', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('lesson-media', 'lesson-media', false, 2147483648, array['video/mp4', 'video/webm', 'application/pdf']),
  ('submissions', 'submissions', false, 26214400, array['application/pdf', 'application/zip', 'image/jpeg', 'image/png',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation']),
  ('identity-documents', 'identity-documents', false, 5242880, array['image/jpeg', 'image/png', 'application/pdf']),
  ('dispute-attachments', 'dispute-attachments', false, 10485760, array['image/jpeg', 'image/png', 'application/pdf']),
  ('external-certificates', 'external-certificates', false, 5242880, array['image/jpeg', 'image/png', 'application/pdf'])
on conflict (id) do nothing;

-- Own-folder write/read for user buckets.
create policy "own folder insert" on storage.objects for insert to authenticated
  with check (bucket_id in ('avatars', 'submissions', 'identity-documents', 'dispute-attachments', 'external-certificates')
              and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own folder update" on storage.objects for update to authenticated
  using (bucket_id in ('avatars', 'external-certificates') and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id in ('avatars', 'external-certificates') and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own folder delete" on storage.objects for delete to authenticated
  using (bucket_id in ('avatars', 'external-certificates', 'submissions') and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own folder read" on storage.objects for select to authenticated
  using (bucket_id in ('submissions', 'identity-documents', 'dispute-attachments', 'external-certificates')
         and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

-- Lesson media: "<course_id>/…", readable by enrolled trainees and course staff.
create policy "lesson media read" on storage.objects for select to authenticated
  using (bucket_id = 'lesson-media' and (
    public.is_enrolled(((storage.foldername(name))[1])::uuid) or public.manages_course(((storage.foldername(name))[1])::uuid)));
create policy "lesson media write" on storage.objects for insert to authenticated
  with check (bucket_id = 'lesson-media' and public.manages_course(((storage.foldername(name))[1])::uuid));
create policy "course covers write" on storage.objects for insert to authenticated
  with check (bucket_id = 'course-covers' and public.manages_course(((storage.foldername(name))[1])::uuid));
