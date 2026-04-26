-- =====================================================================
-- QuizHub — Complete Database Schema
-- Target: Supabase (PostgreSQL 15+)
-- Run this ONCE in a fresh Supabase project via SQL Editor.
-- =====================================================================


-- =====================================================================
-- 1. ENUM TYPES
-- =====================================================================

-- Vai trò người dùng: giáo viên (teacher) hoặc học sinh (student)
create type public.user_role as enum ('teacher', 'student');


-- =====================================================================
-- 2. TABLES (tạo trước để functions/triggers có thể tham chiếu)
-- =====================================================================

-- -----------------------------------------------------------------
-- 2a. profiles — Thông tin người dùng, liên kết 1:1 với auth.users
-- -----------------------------------------------------------------
create table public.profiles (
  id         uuid        primary key references auth.users(id) on delete cascade,
  full_name  text        not null default '',
  role       public.user_role not null default 'student',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table  public.profiles is 'Bảng profile, tạo tự động khi user đăng ký.';
comment on column public.profiles.role is 'teacher = giáo viên, student = học sinh.';

-- -----------------------------------------------------------------
-- 2b. subjects — Danh mục môn học, mỗi giáo viên quản lý riêng
-- -----------------------------------------------------------------
create table public.subjects (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null,
  description text,
  teacher_id  uuid        not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.subjects is 'Danh mục môn học do giáo viên tạo.';

-- -----------------------------------------------------------------
-- 2c. questions — Ngân hàng câu hỏi trắc nghiệm (4 đáp án)
-- -----------------------------------------------------------------
create table public.questions (
  id             uuid        primary key default gen_random_uuid(),
  subject_id     uuid        not null references public.subjects(id) on delete cascade,
  content        text        not null,
  options        jsonb       not null,                     -- mảng 4 string: ["A","B","C","D"]
  correct_answer smallint    not null check (correct_answer between 0 and 3),
  explanation    text,                                     -- giải thích đáp án (tuỳ chọn)
  created_by     uuid        not null references auth.users(id) on delete cascade,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  -- Đảm bảo options luôn là mảng JSON gồm đúng 4 phần tử
  constraint questions_options_is_array check (jsonb_typeof(options) = 'array'),
  constraint questions_options_length   check (jsonb_array_length(options) = 4)
);

comment on table  public.questions is 'Ngân hàng câu hỏi trắc nghiệm.';
comment on column public.questions.options is 'Mảng JSON 4 chuỗi đáp án, VD: ["Hà Nội","TP HCM","Đà Nẵng","Huế"]';
comment on column public.questions.correct_answer is 'Chỉ số đáp án đúng (0-3) trong mảng options.';

-- -----------------------------------------------------------------
-- 2d. exams — Bài thi, gán mã code 6 ký tự để học sinh nhập vào
-- -----------------------------------------------------------------
create table public.exams (
  id           uuid        primary key default gen_random_uuid(),
  title        text        not null,
  subject_id   uuid        references public.subjects(id) on delete set null,
  duration     integer     not null default 30 check (duration > 0),   -- phút
  exam_code    text        not null unique check (char_length(exam_code) = 6),
  created_by   uuid        not null references auth.users(id) on delete cascade,
  published    boolean     not null default false,
  show_answer  boolean     not null default false,  -- hiển thị đáp án sau khi nộp?
  allow_retry  boolean     not null default false,  -- cho phép thi lại?
  max_attempts integer     not null default 1 check (max_attempts >= 1),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table  public.exams is 'Bài thi do giáo viên tạo.';
comment on column public.exams.exam_code is 'Mã 6 ký tự để học sinh tham gia thi, VD: "AB12CD".';
comment on column public.exams.duration is 'Thời gian làm bài tính bằng phút.';

-- -----------------------------------------------------------------
-- 2e. exam_questions — Bảng nối N:N giữa exams và questions
-- -----------------------------------------------------------------
create table public.exam_questions (
  exam_id     uuid    not null references public.exams(id) on delete cascade,
  question_id uuid    not null references public.questions(id) on delete cascade,
  order_index integer not null default 0,  -- thứ tự hiển thị
  primary key (exam_id, question_id)
);

comment on table public.exam_questions is 'Bảng nối: câu hỏi nào thuộc đề thi nào, kèm thứ tự.';

-- -----------------------------------------------------------------
-- 2f. exam_attempts — Lượt thi của học sinh (đăng nhập hoặc ẩn danh)
-- -----------------------------------------------------------------
create table public.exam_attempts (
  id           uuid        primary key default gen_random_uuid(),
  exam_id      uuid        not null references public.exams(id) on delete cascade,
  student_id   uuid        references auth.users(id) on delete set null,  -- NULL = ẩn danh
  student_name text        not null default '',
  answers      jsonb       not null default '{}'::jsonb,  -- { "question_uuid": selected_index }
  score        numeric(5,2),                               -- điểm trên thang 10
  started_at   timestamptz not null default now(),
  submitted_at timestamptz,                                -- NULL = chưa nộp
  is_finished  boolean     not null default false,
  created_at   timestamptz not null default now()
);

comment on table  public.exam_attempts is 'Lượt làm bài của học sinh.';
comment on column public.exam_attempts.student_id is 'NULL nếu học sinh thi ẩn danh (không đăng nhập).';
comment on column public.exam_attempts.answers is 'JSON object: key = question ID, value = index đáp án đã chọn.';


-- =====================================================================
-- 3. INDEXES (tối ưu truy vấn)
-- =====================================================================

create index idx_subjects_teacher         on public.subjects(teacher_id);
create index idx_questions_subject        on public.questions(subject_id);
create index idx_questions_created_by     on public.questions(created_by);
create index idx_exams_created_by         on public.exams(created_by);
create index idx_exams_code               on public.exams(exam_code);
create index idx_exam_questions_exam      on public.exam_questions(exam_id, order_index);
create index idx_exam_attempts_exam       on public.exam_attempts(exam_id);
create index idx_exam_attempts_student    on public.exam_attempts(student_id);


-- =====================================================================
-- 4. FUNCTIONS (tạo sau tables vì có tham chiếu bảng profiles)
-- =====================================================================

-- 4a. Kiểm tra role mà không gây recursive RLS
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

-- 4b. Tự động tạo profile khi user đăng ký qua Supabase Auth
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

-- 4c. Tự động cập nhật cột updated_at khi row bị UPDATE
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


-- =====================================================================
-- 5. TRIGGERS
-- =====================================================================

-- 5a. Tự động tạo profile khi user mới đăng ký
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 5b. Tự động cập nhật updated_at
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger trg_subjects_updated_at
  before update on public.subjects
  for each row execute function public.set_updated_at();

create trigger trg_questions_updated_at
  before update on public.questions
  for each row execute function public.set_updated_at();

create trigger trg_exams_updated_at
  before update on public.exams
  for each row execute function public.set_updated_at();


-- =====================================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- =====================================================================

alter table public.profiles       enable row level security;
alter table public.subjects       enable row level security;
alter table public.questions      enable row level security;
alter table public.exams          enable row level security;
alter table public.exam_questions enable row level security;
alter table public.exam_attempts  enable row level security;

-- -----------------------------------------------------------------
-- 6a. profiles — Chỉ owner đọc/sửa profile của mình
-- -----------------------------------------------------------------

create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using  (id = auth.uid())
  with check (id = auth.uid());

-- -----------------------------------------------------------------
-- 6b. subjects — Giáo viên toàn quyền trên môn học của mình
-- -----------------------------------------------------------------

create policy "subjects_teacher_all"
  on public.subjects for all
  to authenticated
  using  (teacher_id = auth.uid())
  with check (teacher_id = auth.uid() and public.has_role(auth.uid(), 'teacher'));

-- -----------------------------------------------------------------
-- 6c. questions — Giáo viên quản lý câu hỏi của mình
-- -----------------------------------------------------------------

create policy "questions_teacher_all"
  on public.questions for all
  to authenticated
  using  (created_by = auth.uid())
  with check (created_by = auth.uid() and public.has_role(auth.uid(), 'teacher'));

-- Bất kỳ ai cũng đọc được câu hỏi nếu nó thuộc đề thi đã published
create policy "questions_published_readable"
  on public.questions for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.exam_questions eq
      join public.exams e on e.id = eq.exam_id
      where eq.question_id = questions.id
        and e.published = true
    )
  );

-- -----------------------------------------------------------------
-- 6d. exams — Giáo viên quản lý đề thi; published thì ai cũng đọc
-- -----------------------------------------------------------------

create policy "exams_teacher_all"
  on public.exams for all
  to authenticated
  using  (created_by = auth.uid())
  with check (created_by = auth.uid() and public.has_role(auth.uid(), 'teacher'));

create policy "exams_published_readable"
  on public.exams for select
  to anon, authenticated
  using (published = true);

-- -----------------------------------------------------------------
-- 6e. exam_questions — Giáo viên quản lý liên kết; published thì đọc
-- -----------------------------------------------------------------

create policy "exam_questions_teacher_all"
  on public.exam_questions for all
  to authenticated
  using (
    exists (
      select 1 from public.exams e
      where e.id = exam_questions.exam_id
        and e.created_by = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.exams e
      where e.id = exam_questions.exam_id
        and e.created_by = auth.uid()
    )
  );

create policy "exam_questions_published_readable"
  on public.exam_questions for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.exams e
      where e.id = exam_questions.exam_id
        and e.published = true
    )
  );

-- -----------------------------------------------------------------
-- 6f. exam_attempts — Luật cho lượt thi
-- -----------------------------------------------------------------

-- INSERT: Ai cũng bắt đầu thi được nếu đề đã published
create policy "attempts_insert_published"
  on public.exam_attempts for insert
  to anon, authenticated
  with check (
    exists (
      select 1 from public.exams e
      where e.id = exam_attempts.exam_id
        and e.published = true
    )
    and (student_id is null or student_id = auth.uid())
  );

-- UPDATE: Chỉ cập nhật lượt thi chưa hoàn thành (để submit bài)
create policy "attempts_update_inflight"
  on public.exam_attempts for update
  to anon, authenticated
  using (
    is_finished = false
    and exists (
      select 1 from public.exams e
      where e.id = exam_attempts.exam_id
        and e.published = true
    )
  )
  with check (
    exists (
      select 1 from public.exams e
      where e.id = exam_attempts.exam_id
        and e.published = true
    )
  );

-- SELECT (anon): Đọc lượt thi của đề thi published (xem kết quả ẩn danh)
create policy "attempts_anon_select"
  on public.exam_attempts for select
  to anon
  using (
    exists (
      select 1 from public.exams e
      where e.id = exam_attempts.exam_id
        and e.published = true
    )
  );

-- SELECT (authenticated student): Đọc lượt thi của chính mình
create policy "attempts_student_select_own"
  on public.exam_attempts for select
  to authenticated
  using (student_id = auth.uid());

-- SELECT (teacher): Đọc tất cả lượt thi cho đề thi mình tạo
create policy "attempts_teacher_select"
  on public.exam_attempts for select
  to authenticated
  using (
    exists (
      select 1 from public.exams e
      where e.id = exam_attempts.exam_id
        and e.created_by = auth.uid()
    )
  );


-- =====================================================================
-- DONE — Schema QuizHub đã sẵn sàng.
-- Tạo tài khoản giáo viên đầu tiên qua app (Register → role "teacher").
-- =====================================================================
