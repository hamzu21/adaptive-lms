-- ==========================================================
-- STORAGE & ASSIGNMENTS SETUP
-- Run this in your Supabase SQL Editor to fix "Bucket not found" 
-- and "table not found" errors for assignments.
-- ==========================================================

-- 1. Create necessary storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('assignment-files', 'assignment-files', true),
  ('lesson-videos', 'lesson-videos', true)
ON CONFLICT (id) DO NOTHING;

-- 2. RLS Policies for 'assignment-files' bucket
DROP POLICY IF EXISTS "Allow students to upload assignments" ON storage.objects;
CREATE POLICY "Allow students to upload assignments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'assignment-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Allow students to manage their own assignments" ON storage.objects;
CREATE POLICY "Allow students to manage their own assignments"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'assignment-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Allow teachers/admins to read all assignments" ON storage.objects;
CREATE POLICY "Allow teachers/admins to read all assignments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'assignment-files' AND
  (public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin'))
);


-- 3. RLS Policies for 'lesson-videos' bucket (also used for avatars)
DROP POLICY IF EXISTS "Allow users to upload lesson files" ON storage.objects;
CREATE POLICY "Allow users to upload lesson files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'lesson-videos' AND
  (
    (storage.foldername(name))[1] = auth.uid()::text OR 
    (storage.foldername(name))[1] = 'avatars'
  )
);

DROP POLICY IF EXISTS "Allow users to manage their own lesson files" ON storage.objects;
CREATE POLICY "Allow users to manage their own lesson files"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'lesson-videos' AND
  (
    (storage.foldername(name))[1] = auth.uid()::text OR 
    (storage.foldername(name))[1] = 'avatars'
  )
);

DROP POLICY IF EXISTS "Allow public read for lesson files" ON storage.objects;
CREATE POLICY "Allow public read for lesson files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'lesson-videos');


-- 4. Create assignments table
CREATE TABLE IF NOT EXISTS public.assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  due_date timestamptz,
  total_marks integer NOT NULL DEFAULT 100,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

-- Add updated_at trigger
DROP TRIGGER IF EXISTS update_assignments_updated_at ON public.assignments;
CREATE TRIGGER update_assignments_updated_at BEFORE UPDATE ON public.assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


-- 5. Create assignment_submissions table
CREATE TABLE IF NOT EXISTS public.assignment_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  submission_text text,
  file_url text,
  file_name text,
  score integer,
  feedback text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  graded_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(assignment_id, student_id)
);

-- Enable RLS
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;

-- Add updated_at trigger
DROP TRIGGER IF EXISTS update_assignment_submissions_updated_at ON public.assignment_submissions;
CREATE TRIGGER update_assignment_submissions_updated_at BEFORE UPDATE ON public.assignment_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


-- ============ 6. RLS POLICIES FOR ASSIGNMENT TABLES ============

-- ASSIGNMENTS POLICIES
DROP POLICY IF EXISTS "Teachers can CRUD assignments for own courses" ON public.assignments;
CREATE POLICY "Teachers can CRUD assignments for own courses" ON public.assignments
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.courses WHERE courses.id = assignments.course_id AND courses.teacher_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.courses WHERE courses.id = assignments.course_id AND courses.teacher_id = auth.uid()));

DROP POLICY IF EXISTS "Enrolled students can view published assignments" ON public.assignments;
CREATE POLICY "Enrolled students can view published assignments" ON public.assignments
  FOR SELECT TO authenticated
  USING (
    is_published = true
    AND EXISTS (SELECT 1 FROM public.enrollments WHERE enrollments.course_id = assignments.course_id AND enrollments.student_id = auth.uid())
  );


-- SUBMISSIONS POLICIES
DROP POLICY IF EXISTS "Students can manage own submissions" ON public.assignment_submissions;
CREATE POLICY "Students can manage own submissions" ON public.assignment_submissions
  FOR ALL TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "Teachers can view/grade submissions for own courses" ON public.assignment_submissions;
CREATE POLICY "Teachers can view/grade submissions for own courses" ON public.assignment_submissions
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.assignments a
    JOIN public.courses c ON c.id = a.course_id
    WHERE a.id = assignment_submissions.assignment_id AND c.teacher_id = auth.uid()
  ));

-- ============ 7. QUESTIONS POLICY FOR REVIEW ============

-- Allow students to view questions of published assessments they are enrolled in
-- This is NECESSARY for the Question Review to work, as the UI joins attempt_responses with questions.
DROP POLICY IF EXISTS "Students can view questions for review" ON public.questions;
CREATE POLICY "Students can view questions for review" ON public.questions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.assessments a
      JOIN public.enrollments e ON e.course_id = a.course_id
      WHERE a.id = questions.assessment_id AND a.is_published = true AND e.student_id = auth.uid()
    )
  );
