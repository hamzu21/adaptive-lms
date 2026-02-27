
-- Create security definer helpers to break circular RLS references

-- Check if a student is enrolled in a course (used by courses policy)
CREATE OR REPLACE FUNCTION public.is_enrolled(_student_id uuid, _course_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.enrollments
    WHERE student_id = _student_id AND course_id = _course_id
  )
$$;

-- Check if a user is the teacher of a course (used by enrollments/lessons/assessments policies)
CREATE OR REPLACE FUNCTION public.is_course_teacher(_user_id uuid, _course_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.courses
    WHERE id = _course_id AND teacher_id = _user_id
  )
$$;

-- Check if a user is the teacher of an assessment's course
CREATE OR REPLACE FUNCTION public.is_assessment_teacher(_user_id uuid, _assessment_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.assessments a
    JOIN public.courses c ON c.id = a.course_id
    WHERE a.id = _assessment_id AND c.teacher_id = _user_id
  )
$$;

-- Drop and recreate problematic policies

-- COURSES: fix student policy
DROP POLICY IF EXISTS "Students can view enrolled published courses" ON public.courses;
CREATE POLICY "Students can view enrolled published courses" ON public.courses
  FOR SELECT TO authenticated
  USING (is_published = true AND public.is_enrolled(auth.uid(), id));

-- ENROLLMENTS: fix teacher policy
DROP POLICY IF EXISTS "Teachers can manage enrollments for own courses" ON public.enrollments;
CREATE POLICY "Teachers can manage enrollments for own courses" ON public.enrollments
  FOR ALL TO authenticated
  USING (public.is_course_teacher(auth.uid(), course_id))
  WITH CHECK (public.is_course_teacher(auth.uid(), course_id));

-- LESSONS: fix policies
DROP POLICY IF EXISTS "Teachers can CRUD lessons of own courses" ON public.lessons;
CREATE POLICY "Teachers can CRUD lessons of own courses" ON public.lessons
  FOR ALL TO authenticated
  USING (public.is_course_teacher(auth.uid(), course_id))
  WITH CHECK (public.is_course_teacher(auth.uid(), course_id));

DROP POLICY IF EXISTS "Enrolled students can view lessons" ON public.lessons;
CREATE POLICY "Enrolled students can view lessons" ON public.lessons
  FOR SELECT TO authenticated
  USING (public.is_enrolled(auth.uid(), course_id));

-- ASSESSMENTS: fix policies
DROP POLICY IF EXISTS "Teachers can CRUD assessments of own courses" ON public.assessments;
CREATE POLICY "Teachers can CRUD assessments of own courses" ON public.assessments
  FOR ALL TO authenticated
  USING (public.is_course_teacher(auth.uid(), course_id))
  WITH CHECK (public.is_course_teacher(auth.uid(), course_id));

DROP POLICY IF EXISTS "Enrolled students can view published assessments" ON public.assessments;
CREATE POLICY "Enrolled students can view published assessments" ON public.assessments
  FOR SELECT TO authenticated
  USING (is_published = true AND public.is_enrolled(auth.uid(), course_id));

-- QUESTIONS: fix policies
DROP POLICY IF EXISTS "Teachers can CRUD questions of own assessments" ON public.questions;
CREATE POLICY "Teachers can CRUD questions of own assessments" ON public.questions
  FOR ALL TO authenticated
  USING (public.is_assessment_teacher(auth.uid(), assessment_id))
  WITH CHECK (public.is_assessment_teacher(auth.uid(), assessment_id));

DROP POLICY IF EXISTS "Students can view questions of published assessments" ON public.questions;
CREATE POLICY "Students can view questions of published assessments" ON public.questions
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.assessments a
    WHERE a.id = questions.assessment_id AND a.is_published = true
    AND public.is_enrolled(auth.uid(), a.course_id)
  ));

-- ASSESSMENT_ATTEMPTS: fix teacher view policy
DROP POLICY IF EXISTS "Teachers can view attempts for own courses" ON public.assessment_attempts;
CREATE POLICY "Teachers can view attempts for own courses" ON public.assessment_attempts
  FOR SELECT TO authenticated
  USING (public.is_assessment_teacher(auth.uid(), assessment_id));

-- ATTEMPT_RESPONSES: fix teacher view policy
DROP POLICY IF EXISTS "Teachers can view responses for own courses" ON public.attempt_responses;
CREATE POLICY "Teachers can view responses for own courses" ON public.attempt_responses
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.assessment_attempts att
    WHERE att.id = attempt_responses.attempt_id
    AND public.is_assessment_teacher(auth.uid(), att.assessment_id)
  ));
