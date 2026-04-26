-- Run this in your Supabase SQL Editor to allow anonymous users to view their results
-- Since attempt IDs are UUIDv4, guessing another anonymous user's attempt is practically impossible.

DROP POLICY IF EXISTS "Students can view their own attempts" ON public.exam_attempts;

CREATE POLICY "Students can view their own attempts or anonymous"
ON public.exam_attempts FOR SELECT
USING (student_id = auth.uid() OR student_id IS NULL);
