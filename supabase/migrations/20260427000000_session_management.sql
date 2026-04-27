-- Update check_max_attempts trigger to use anon_secret instead of student_name
create or replace function public.check_max_attempts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_max_attempts int;
  v_allow_retry boolean;
  v_current_attempts int;
begin
  select max_attempts, allow_retry into v_max_attempts, v_allow_retry
  from public.exams where id = new.exam_id;
  
  if not v_allow_retry then
    v_max_attempts := 1;
  end if;

  if new.student_id is not null then
    select count(*) into v_current_attempts
    from public.exam_attempts
    where exam_id = new.exam_id and student_id = new.student_id;
    
    if v_current_attempts >= v_max_attempts then
      raise exception 'Maximum attempts reached for this exam';
    end if;
  else
    select count(*) into v_current_attempts
    from public.exam_attempts
    where exam_id = new.exam_id and anon_secret = new.anon_secret and student_id is null;
    
    if v_current_attempts >= v_max_attempts then
      raise exception 'Maximum attempts reached for this session';
    end if;
  end if;
  
  return new;
end;
$$;

-- RPC to get active attempt
create or replace function public.get_active_exam_attempt(p_exam_id uuid, p_secret text default null)
returns setof public.exam_attempts
language plpgsql
security definer
as $$
begin
  return query
  select * from public.exam_attempts
  where exam_id = p_exam_id
    and is_finished = false
    and (
      (student_id = auth.uid()) or
      (student_id is null and anon_secret = p_secret)
    )
  order by started_at desc
  limit 1;
end;
$$;

-- RPC to start a new attempt securely
create or replace function public.start_attempt(p_exam_id uuid, p_student_name text, p_secret text default null)
returns setof public.exam_attempts
language plpgsql
security definer
as $$
declare
  v_active_count int;
  v_is_published boolean;
begin
  -- Check if exam is published
  select published into v_is_published
  from public.exams where id = p_exam_id;
  
  if not found or not v_is_published then
    raise exception 'This exam is not published and cannot be started.';
  end if;

  -- Check for existing active attempt
  select count(*) into v_active_count
  from public.exam_attempts
  where exam_id = p_exam_id
    and is_finished = false
    and (
      (student_id = auth.uid()) or
      (student_id is null and anon_secret = p_secret)
    );

  if v_active_count > 0 then
    raise exception 'You already have an active attempt for this exam. Please finish it first.';
  end if;

  -- Insert new attempt (trigger check_max_attempts will fire here to enforce limits)
  return query
  insert into public.exam_attempts (
    exam_id,
    student_id,
    student_name,
    anon_secret,
    is_finished,
    answers,
    started_at
  ) values (
    p_exam_id,
    auth.uid(),
    p_student_name,
    p_secret,
    false,
    '{}'::jsonb,
    now()
  ) returning *;
end;
$$;

-- RPC to save progress
create or replace function public.save_attempt_progress(p_attempt_id uuid, p_answers jsonb, p_secret text default null)
returns void
language plpgsql
security definer
as $$
declare
  v_attempt public.exam_attempts;
  v_exam public.exams;
begin
  select * into v_attempt from public.exam_attempts 
  where id = p_attempt_id 
    and is_finished = false
    and (
      (student_id = auth.uid()) or
      (student_id is null and anon_secret = p_secret)
    );

  if not found then
    raise exception 'Attempt not found or unauthorized';
  end if;

  select * into v_exam from public.exams where id = v_attempt.exam_id;

  -- Check if time limit reached before allowing save (no grace period for saving progress, strict)
  if now() > (v_attempt.started_at + (v_exam.duration || ' minutes')::interval) then
    raise exception 'Time limit reached. Cannot save progress.';
  end if;

  update public.exam_attempts
  set answers = p_answers
  where id = p_attempt_id;
end;
$$;

-- Update submit RPC with timeout logic
create or replace function public.submit_exam_attempt(
  attempt_id uuid, 
  user_answers jsonb,
  secret text default null
)
returns void
language plpgsql
security definer
as $$
declare
  v_attempt public.exam_attempts;
  v_exam public.exams;
  v_correct_count int := 0;
  v_total_count int := 0;
  v_score numeric := 0;
  v_q record;
  v_final_answers jsonb;
  v_time_limit_reached boolean := false;
begin
  select * into v_attempt from public.exam_attempts 
  where id = attempt_id 
    and is_finished = false
    and (
      (student_id = auth.uid()) or
      (student_id is null and anon_secret = secret)
    );

  if not found then
    raise exception 'Attempt not found or unauthorized';
  end if;

  select * into v_exam from public.exams where id = v_attempt.exam_id;
  
  -- Check timeout with 1 min grace period
  if now() > (v_attempt.started_at + (v_exam.duration || ' minutes')::interval + interval '1 minute') then
    v_time_limit_reached := true;
  end if;

  -- If time limit reached, fallback to previously saved answers on server, ignoring the newly submitted ones.
  if v_time_limit_reached then
    v_final_answers := v_attempt.answers;
  else
    v_final_answers := user_answers;
  end if;

  select count(*) into v_total_count from public.exam_questions where exam_id = v_attempt.exam_id;
  
  for v_q in (
    select q.id, q.correct_answer 
    from public.exam_questions eq
    join public.questions q on q.id = eq.question_id
    where eq.exam_id = v_attempt.exam_id
  ) loop
    if v_final_answers->>v_q.id::text = v_q.correct_answer::text then
      v_correct_count := v_correct_count + 1;
    end if;
  end loop;

  if v_total_count > 0 then
    v_score := (v_correct_count::numeric / v_total_count) * 10;
  end if;

  update public.exam_attempts
  set 
    answers = v_final_answers,
    score = v_score,
    is_finished = true,
    submitted_at = now()
  where id = attempt_id;
end;
$$;

-- Drop insecure direct DML policies since all modifications go through secure RPCs
drop policy if exists "Attempts: anyone can start for published exam" on public.exam_attempts;
drop policy if exists "Attempts: student updates own in-flight" on public.exam_attempts;
