
-- ========================================
-- 1. Student Notes (per-lesson personal notes)
-- ========================================
CREATE TABLE public.student_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(student_id, lesson_id)
);

ALTER TABLE public.student_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can manage own notes"
  ON public.student_notes FOR ALL
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

CREATE TRIGGER update_student_notes_updated_at
  BEFORE UPDATE ON public.student_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ========================================
-- 2. Assignments (created by teachers)
-- ========================================
CREATE TABLE public.assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  total_marks integer NOT NULL DEFAULT 100,
  due_date timestamptz,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can CRUD assignments of own courses"
  ON public.assignments FOR ALL
  USING (is_course_teacher(auth.uid(), course_id))
  WITH CHECK (is_course_teacher(auth.uid(), course_id));

CREATE POLICY "Enrolled students can view published assignments"
  ON public.assignments FOR SELECT
  USING (is_published = true AND is_enrolled(auth.uid(), course_id));

CREATE POLICY "Admins can view all assignments"
  ON public.assignments FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Parents can view children assignments"
  ON public.assignments FOR SELECT
  USING (
    has_role(auth.uid(), 'parent') AND EXISTS (
      SELECT 1 FROM parent_children pc
      JOIN enrollments e ON e.student_id = pc.child_id
      WHERE pc.parent_id = auth.uid() AND e.course_id = assignments.course_id
    )
  );

CREATE TRIGGER update_assignments_updated_at
  BEFORE UPDATE ON public.assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ========================================
-- 3. Assignment Submissions (by students)
-- ========================================
CREATE TABLE public.assignment_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  submission_text text,
  file_url text,
  file_name text,
  score integer,
  feedback text,
  graded_at timestamptz,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(assignment_id, student_id)
);

ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;

-- Students can insert and view their own submissions
CREATE POLICY "Students can insert own submissions"
  ON public.assignment_submissions FOR INSERT
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students can view own submissions"
  ON public.assignment_submissions FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "Students can update own ungraded submissions"
  ON public.assignment_submissions FOR UPDATE
  USING (student_id = auth.uid() AND graded_at IS NULL);

-- Helper function for assignment teacher check
CREATE OR REPLACE FUNCTION public.is_assignment_course_teacher(_user_id uuid, _assignment_id uuid)
  RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.assignments a
    JOIN public.courses c ON c.id = a.course_id
    WHERE a.id = _assignment_id AND c.teacher_id = _user_id
  )
$$;

-- Teachers can view and grade submissions for own courses
CREATE POLICY "Teachers can view submissions for own courses"
  ON public.assignment_submissions FOR SELECT
  USING (is_assignment_course_teacher(auth.uid(), assignment_id));

CREATE POLICY "Teachers can grade submissions"
  ON public.assignment_submissions FOR UPDATE
  USING (is_assignment_course_teacher(auth.uid(), assignment_id));

CREATE POLICY "Admins can view all submissions"
  ON public.assignment_submissions FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Parents can view children submissions"
  ON public.assignment_submissions FOR SELECT
  USING (
    has_role(auth.uid(), 'parent') AND EXISTS (
      SELECT 1 FROM parent_children pc
      WHERE pc.parent_id = auth.uid() AND pc.child_id = assignment_submissions.student_id
    )
  );

CREATE TRIGGER update_assignment_submissions_updated_at
  BEFORE UPDATE ON public.assignment_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ========================================
-- 4. Storage bucket for assignment files
-- ========================================
INSERT INTO storage.buckets (id, name, public) VALUES ('assignment-files', 'assignment-files', false);

CREATE POLICY "Students can upload assignment files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'assignment-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Students can view own assignment files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'assignment-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Teachers can view assignment files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'assignment-files' AND has_role(auth.uid(), 'teacher'));

CREATE POLICY "Students can delete own assignment files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'assignment-files' AND auth.uid()::text = (storage.foldername(name))[1]);
