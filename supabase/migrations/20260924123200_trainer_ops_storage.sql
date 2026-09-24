-- TRR-CRS-11 «افتح الملف» (444:23127): the course's trainer reads the submitted file.
-- Scoped to objects that are the file of a submission on a course the caller manages.
create index if not exists assignment_submissions_file_path_idx on public.assignment_submissions (file_path) where file_path is not null;

drop policy if exists "course staff read submissions" on storage.objects;
create policy "course staff read submissions" on storage.objects for select to authenticated
using (
  bucket_id = 'submissions'
  and exists (
    select 1 from public.assignment_submissions s join public.assignments a on a.id = s.assignment_id
    where s.file_path = storage.objects.name and public.manages_course(a.course_id)
  )
);
