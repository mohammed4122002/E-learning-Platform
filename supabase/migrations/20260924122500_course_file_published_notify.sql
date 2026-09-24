-- TRR-CRS-05 ٣ الملفات · «يصلهم إشعار عند نشر ملف جديد»: when a course file becomes visible (inserted as
-- published, or a draft is published) every current trainee of the course gets a notification.
create or replace function public.notify_course_file_published()
returns trigger
language plpgsql security definer set search_path = '' as $$
declare c_title text; r record;
begin
  if new.published_at is null or (tg_op = 'UPDATE' and old.published_at is not null) then
    return new;
  end if;
  select title into c_title from public.courses where id = new.course_id and status <> 'draft';
  if c_title is null then return new; end if;
  for r in select e.id, e.trainee_id from public.enrollments e
           where e.course_id = new.course_id and e.status in ('pending_provider', 'confirmed', 'in_progress') loop
    perform public.notify(r.trainee_id, 'course_file', 'ملف جديد في دورتك', c_title || ' · ' || new.title,
      '/trainee/trainings/' || r.id);
  end loop;
  return new;
end $$;

revoke all on function public.notify_course_file_published() from public;

drop trigger if exists course_files_published_notify on public.course_files;
create trigger course_files_published_notify
  after insert or update of published_at on public.course_files
  for each row execute function public.notify_course_file_published();
