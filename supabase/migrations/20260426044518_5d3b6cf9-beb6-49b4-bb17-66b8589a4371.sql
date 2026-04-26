-- =====================================================================
-- QuizHub schema
-- =====================================================================

-- Roles enum (separate from profiles to support proper role checks)
create type public.user_role as enum ('teacher', 'student');

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role public.user_role not null default 'student',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Security definer helper to check a user's role without recursive RLS
create or replace function public.has_role(_user_id uuid, _role public.user_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = _user_id and role = _role
  );
$$;

-- Auto-create a profile when a new auth user is inserted
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'student')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- updated_at helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- profiles policies: owner-only access
create policy "Profiles: owner can read"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

create policy "Profiles: owner can update"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ---------------------------------------------------------------------
-- subjects
-- ---------------------------------------------------------------------
create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  teacher_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index subjects_teacher_idx on public.subjects(teacher_id);

alter table public.subjects enable row level security;

create trigger subjects_set_updated_at
before update on public.subjects
for each row execute function public.set_updated_at();

create policy "Subjects: teacher owns rows"
  on public.subjects for all
  to authenticated
  using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid() and public.has_role(auth.uid(), 'teacher'));

-- ---------------------------------------------------------------------
-- questions
-- ---------------------------------------------------------------------
create table public.questions (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  content text not null,
  options jsonb not null,
  correct_answer smallint not null check (correct_answer between 0 and 3),
  explanation text,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint questions_options_is_array check (jsonb_typeof(options) = 'array'),
  constraint questions_options_length check (jsonb_array_length(options) = 4)
);

create index questions_subject_idx on public.questions(subject_id);
create index questions_created_by_idx on public.questions(created_by);

alter table public.questions enable row level security;

create trigger questions_set_updated_at
before update on public.questions
for each row execute function public.set_updated_at();

create policy "Questions: teacher owns rows"
  on public.questions for all
  to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid() and public.has_role(auth.uid(), 'teacher'));

-- ---------------------------------------------------------------------
-- exams
-- ---------------------------------------------------------------------
create table public.exams (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subject_id uuid references public.subjects(id) on delete set null,
  duration integer not null default 30 check (duration > 0), -- minutes
  exam_code text not null unique check (char_length(exam_code) = 6),
  created_by uuid not null references auth.users(id) on delete cascade,
  published boolean not null default false,
  show_answer boolean not null default false,
  allow_retry boolean not null default false,
  max_attempts integer not null default 1 check (max_attempts >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index exams_created_by_idx on public.exams(created_by);
create index exams_code_idx on public.exams(exam_code);

alter table public.exams enable row level security;

create trigger exams_set_updated_at
before update on public.exams
for each row execute function public.set_updated_at();

-- Teacher full control over their own exams
create policy "Exams: teacher manages own"
  on public.exams for all
  to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid() and public.has_role(auth.uid(), 'teacher'));

-- Anyone (incl. anon) can read a published exam (used for join-by-code)
create policy "Exams: published readable by anyone"
  on public.exams for select
  to anon, authenticated
  using (published = true);

-- ---------------------------------------------------------------------
-- exam_questions (join table)
-- ---------------------------------------------------------------------
create table public.exam_questions (
  exam_id uuid not null references public.exams(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  order_index integer not null default 0,
  primary key (exam_id, question_id)
);

create index exam_questions_exam_idx on public.exam_questions(exam_id, order_index);

alter table public.exam_questions enable row level security;

-- Teacher manages links for their own exam
create policy "ExamQuestions: teacher manages own"
  on public.exam_questions for all
  to authenticated
  using (
    exists (
      select 1 from public.exams e
      where e.id = exam_id and e.created_by = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.exams e
      where e.id = exam_id and e.created_by = auth.uid()
    )
  );

-- Anyone can read links of a published exam
create policy "ExamQuestions: published readable"
  on public.exam_questions for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.exams e
      where e.id = exam_id and e.published = true
    )
  );

-- Anyone can read questions that belong to a published exam (for taking it)
create policy "Questions: readable when in published exam"
  on public.questions for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.exam_questions eq
      join public.exams e on e.id = eq.exam_id
      where eq.question_id = questions.id and e.published = true
    )
  );

-- ---------------------------------------------------------------------
-- exam_attempts
-- ---------------------------------------------------------------------
create table public.exam_attempts (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  student_id uuid references auth.users(id) on delete set null,
  student_name text not null default '',
  answers jsonb not null default '{}'::jsonb,
  score numeric(5,2),
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  is_finished boolean not null default false,
  created_at timestamptz not null default now()
);

create index attempts_exam_idx on public.exam_attempts(exam_id);
create index attempts_student_idx on public.exam_attempts(student_id);

alter table public.exam_attempts enable row level security;

-- Teacher can read all attempts for their own exams
create policy "Attempts: teacher reads own exam attempts"
  on public.exam_attempts for select
  to authenticated
  using (
    exists (
      select 1 from public.exams e
      where e.id = exam_id and e.created_by = auth.uid()
    )
  );

-- Logged-in student reads only their own attempts
create policy "Attempts: student reads own"
  on public.exam_attempts for select
  to authenticated
  using (student_id = auth.uid());

-- Anyone can read an attempt by id (used to render result screen for anon takers).
-- The id is a UUID acting as an unguessable token, scoped to a published exam.
create policy "Attempts: readable by id for published exam"
  on public.exam_attempts for select
  to anon
  using (
    exists (
      select 1 from public.exams e
      where e.id = exam_id and e.published = true
    )
  );

-- Anyone can create an attempt against a published exam
create policy "Attempts: anyone can start for published exam"
  on public.exam_attempts for insert
  to anon, authenticated
  with check (
    exists (
      select 1 from public.exams e
      where e.id = exam_id and e.published = true
    )
    and (student_id is null or student_id = auth.uid())
  );

-- Anyone can update their own in-flight attempt (anon: by knowing the id; auth: by ownership)
create policy "Attempts: update own in-flight"
  on public.exam_attempts for update
  to anon, authenticated
  using (
    is_finished = false
    and exists (
      select 1 from public.exams e
      where e.id = exam_id and e.published = true
    )
  )
  with check (
    exists (
      select 1 from public.exams e
      where e.id = exam_id and e.published = true
    )
  );
