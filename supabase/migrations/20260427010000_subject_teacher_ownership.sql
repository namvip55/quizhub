-- Make subject ownership explicit at the database level.
-- Each subject belongs to the Teacher profile that created it.

do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where constraint_schema = 'public'
      and table_name = 'subjects'
      and constraint_name = 'subjects_teacher_id_fkey'
  ) then
    alter table public.subjects
      add constraint subjects_teacher_id_fkey
      foreign key (teacher_id) references public.profiles(id) on delete cascade;
  end if;
end $$;
