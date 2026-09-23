-- Performance advisor fixes. Non-destructive: only adds indexes and rewrites policy expressions to the
-- equivalent `(select auth.uid())` form so Postgres evaluates it once per statement instead of per row.

-- 1. Covering index for every single-column foreign key in `public` that has none.
do $$
declare r record;
begin
  for r in
    select c.conrelid::regclass as tbl, a.attname as col, c.conrelid, c.conkey
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
    where c.contype = 'f'
      and c.connamespace = 'public'::regnamespace
      and array_length(c.conkey, 1) = 1
      and not exists (
        select 1 from pg_index i
        where i.indrelid = c.conrelid and i.indkey[0] = c.conkey[1]
      )
  loop
    execute format('create index if not exists %I on %s (%I)',
      left(replace(r.tbl::text, 'public.', '') || '_' || r.col || '_fk_idx', 63), r.tbl, r.col);
  end loop;
end $$;

-- 2. RLS policies: auth.uid() → (select auth.uid()). Already-wrapped calls are kept as they are.
do $$
declare
  p record;
  q text;
  w text;
  stmt text;
begin
  for p in
    select schemaname, tablename, policyname, qual, with_check
    from pg_policies
    where schemaname = 'public'
      and (qual ~ 'auth\.uid\(\)' or with_check ~ 'auth\.uid\(\)')
  loop
    q := p.qual;
    w := p.with_check;
    if q is not null then
      q := replace(replace(replace(q, '( SELECT auth.uid() AS uid)', '@@UID@@'), 'auth.uid()', '(select auth.uid())'), '@@UID@@', '(select auth.uid())');
    end if;
    if w is not null then
      w := replace(replace(replace(w, '( SELECT auth.uid() AS uid)', '@@UID@@'), 'auth.uid()', '(select auth.uid())'), '@@UID@@', '(select auth.uid())');
    end if;
    if q is distinct from p.qual or w is distinct from p.with_check then
      stmt := format('alter policy %I on %I.%I', p.policyname, p.schemaname, p.tablename);
      if q is not null then stmt := stmt || format(' using (%s)', q); end if;
      if w is not null then stmt := stmt || format(' with check (%s)', w); end if;
      execute stmt;
    end if;
  end loop;
end $$;
