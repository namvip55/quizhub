-- =========================================================
-- QuizHub - Full Supabase SQL Schema (current state)
-- Includes: enums, tables, RLS policies, functions, triggers
-- =========================================================

-- ---------- EXTENSIONS ----------
create extension if not exists "pgcrypto";

-- ---------- ENUMS ----------
do $$ begin
  create type public.user_role as enum ('teacher', 'student');
exception
  when duplicate_object then null;
end $$;

-- =========================================================
-- TABLES
-- =========================================================

-- ---------- profiles ----------
create table if not exists public.profiles (
  id uuid primary key,
  full_name text not null default '',
  role public.user_role not null default 'student',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- subjects ----------
create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- questions ----------
create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  created_by uuid not null,
  content text not null,
  options jsonb not null,            -- e.g. ["A","B","C","D"]
  correct_answer smallint not null,  -- index in options
  explanation text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- exams ----------
create table if not exists public.exams (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null,
  subject_id uuid references public.subjects(id) on delete set null,
  title text not null,
  exam_code text not null unique,
  duration int not null default 30,        -- minutes
  published boolean not null default false,
  show_answer boolean not null default false,
  allow_retry boolean not null default false,
  max_attempts int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- exam_questions (join) ----------
create table if not exists public.exam_questions (
  exam_id uuid not null references public.exams(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  order_index int not null default 0,
  primary key (exam_id, question_id)
);

-- ---------- exam_attempts ----------
create table if not exists public.exam_attempts (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  student_id uuid,                      -- null = anonymous student
  student_name text not null default '',
  answers jsonb not null default '{}'::jsonb,
  score numeric,
  is_finished boolean not null default false,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  created_at timestamptz not null default now()
);

-- =========================================================
-- FUNCTIONS
-- =========================================================

-- has_role: avoids recursive RLS
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

-- handle_new_user: auto-create profile from auth.users metadata
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

-- set_updated_at trigger function
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =========================================================
-- TRIGGERS
-- =========================================================

-- Auto profile creation on auth signup
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- updated_at triggers
drop trigger if exists trg_profiles_updated  on public.profiles;
drop trigger if exists trg_subjects_updated  on public.subjects;
drop trigger if exists trg_questions_updated on public.questions;
drop trigger if exists trg_exams_updated     on public.exams;

create trigger trg_profiles_updated  before update on public.profiles  for each row execute function public.set_updated_at();
create trigger trg_subjects_updated  before update on public.subjects  for each row execute function public.set_updated_at();
create trigger trg_questions_updated before update on public.questions for each row execute function public.set_updated_at();
create trigger trg_exams_updated     before update on public.exams     for each row execute function public.set_updated_at();

-- =========================================================
-- ENABLE ROW LEVEL SECURITY
-- =========================================================
alter table public.profiles       enable row level security;
alter table public.subjects       enable row level security;
alter table public.questions      enable row level security;
alter table public.exams          enable row level security;
alter table public.exam_questions enable row level security;
alter table public.exam_attempts  enable row level security;

-- =========================================================
-- RLS POLICIES
-- =========================================================

-- ---------- profiles ----------
create policy "Profiles: owner can read"
on public.profiles for select to authenticated
using (id = auth.uid());

create policy "Profiles: owner can update"
on public.profiles for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- ---------- subjects ----------
create policy "Subjects: teacher owns rows"
on public.subjects for all to authenticated
using (teacher_id = auth.uid())
with check (teacher_id = auth.uid() and public.has_role(auth.uid(), 'teacher'));

-- ---------- questions ----------
create policy "Questions: teacher owns rows"
on public.questions for all to authenticated
using (created_by = auth.uid())
with check (created_by = auth.uid() and public.has_role(auth.uid(), 'teacher'));

create policy "Questions: readable when in published exam"
on public.questions for select to anon, authenticated
using (
  exists (
    select 1 from public.exam_questions eq
    join public.exams e on e.id = eq.exam_id
    where eq.question_id = questions.id and e.published = true
  )
);

-- ---------- exams ----------
create policy "Exams: teacher manages own"
on public.exams for all to authenticated
using (created_by = auth.uid())
with check (created_by = auth.uid() and public.has_role(auth.uid(), 'teacher'));

create policy "Exams: published readable by anyone"
on public.exams for select to anon, authenticated
using (published = true);

-- ---------- exam_questions ----------
create policy "ExamQuestions: teacher manages own"
on public.exam_questions for all to authenticated
using (
  exists (select 1 from public.exams e where e.id = exam_questions.exam_id and e.created_by = auth.uid())
)
with check (
  exists (select 1 from public.exams e where e.id = exam_questions.exam_id and e.created_by = auth.uid())
);

create policy "ExamQuestions: published readable"
on public.exam_questions for select to anon, authenticated
using (
  exists (select 1 from public.exams e where e.id = exam_questions.exam_id and e.published = true)
);

-- ---------- exam_attempts ----------
create policy "Attempts: anyone can start for published exam"
on public.exam_attempts for insert to anon, authenticated
with check (
  exists (select 1 from public.exams e where e.id = exam_attempts.exam_id and e.published = true)
  and (student_id is null or student_id = auth.uid())
);

create policy "Attempts: update own in-flight"
on public.exam_attempts for update to anon, authenticated
using (
  is_finished = false
  and exists (select 1 from public.exams e where e.id = exam_attempts.exam_id and e.published = true)
)
with check (
  exists (select 1 from public.exams e where e.id = exam_attempts.exam_id and e.published = true)
);

create policy "Attempts: readable by id for published exam"
on public.exam_attempts for select to anon
using (
  exists (select 1 from public.exams e where e.id = exam_attempts.exam_id and e.published = true)
);

create policy "Attempts: student reads own"
on public.exam_attempts for select to authenticated
using (student_id = auth.uid());

create policy "Attempts: teacher reads own exam attempts"
on public.exam_attempts for select to authenticated
using (
  exists (select 1 from public.exams e where e.id = exam_attempts.exam_id and e.created_by = auth.uid())
);

-- =========================================================
-- INDEXES (performance)
-- =========================================================
create index if not exists idx_subjects_teacher       on public.subjects(teacher_id);
create index if not exists idx_questions_subject      on public.questions(subject_id);
create index if not exists idx_questions_created_by   on public.questions(created_by);
create index if not exists idx_exams_created_by       on public.exams(created_by);
create index if not exists idx_exams_subject          on public.exams(subject_id);
create index if not exists idx_exams_code             on public.exams(exam_code);
create index if not exists idx_exam_questions_exam    on public.exam_questions(exam_id);
create index if not exists idx_exam_attempts_exam     on public.exam_attempts(exam_id);
create index if not exists idx_exam_attempts_student  on public.exam_attempts(student_id);
