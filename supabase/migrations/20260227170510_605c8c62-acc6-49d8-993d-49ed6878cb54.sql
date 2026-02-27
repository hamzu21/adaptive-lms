
-- 1. courses
CREATE TABLE public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  subject text NOT NULL DEFAULT '',
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 2. lessons
CREATE TABLE public.lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_lessons_updated_at BEFORE UPDATE ON public.lessons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 3. enrollments
CREATE TABLE public.enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(student_id, course_id)
);
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

-- 4. lesson_progress
CREATE TABLE public.lesson_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  UNIQUE(student_id, lesson_id)
);
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

-- 5. assessments
CREATE TABLE public.assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  total_marks integer NOT NULL DEFAULT 100,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;

-- 6. questions
CREATE TABLE public.questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  options jsonb NOT NULL,
  correct_option integer NOT NULL,
  marks integer NOT NULL DEFAULT 1,
  position integer NOT NULL DEFAULT 0
);
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

-- 7. assessment_attempts
CREATE TABLE public.assessment_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  assessment_id uuid NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  score integer,
  total_marks integer,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
ALTER TABLE public.assessment_attempts ENABLE ROW LEVEL SECURITY;

-- 8. attempt_responses
CREATE TABLE public.attempt_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES public.assessment_attempts(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  selected_option integer,
  is_correct boolean NOT NULL DEFAULT false
);
ALTER TABLE public.attempt_responses ENABLE ROW LEVEL SECURITY;

-- ============ RLS POLICIES ============

-- COURSES
CREATE POLICY "Teachers can CRUD own courses" ON public.courses
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'teacher') AND teacher_id = auth.uid())
  WITH CHECK (public.has_role(auth.uid(), 'teacher') AND teacher_id = auth.uid());

CREATE POLICY "Students can view enrolled published courses" ON public.courses
  FOR SELECT TO authenticated
  USING (
    is_published = true
    AND EXISTS (SELECT 1 FROM public.enrollments WHERE enrollments.course_id = courses.id AND enrollments.student_id = auth.uid())
  );

CREATE POLICY "Admins can view all courses" ON public.courses
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- LESSONS
CREATE POLICY "Teachers can CRUD lessons of own courses" ON public.lessons
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.courses WHERE courses.id = lessons.course_id AND courses.teacher_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.courses WHERE courses.id = lessons.course_id AND courses.teacher_id = auth.uid()));

CREATE POLICY "Enrolled students can view lessons" ON public.lessons
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.enrollments e
    JOIN public.courses c ON c.id = e.course_id
    WHERE c.id = lessons.course_id AND e.student_id = auth.uid() AND c.is_published = true
  ));

-- ENROLLMENTS
CREATE POLICY "Teachers can manage enrollments for own courses" ON public.enrollments
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.courses WHERE courses.id = enrollments.course_id AND courses.teacher_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.courses WHERE courses.id = enrollments.course_id AND courses.teacher_id = auth.uid()));

CREATE POLICY "Students can view own enrollments" ON public.enrollments
  FOR SELECT TO authenticated
  USING (student_id = auth.uid());

CREATE POLICY "Admins can view all enrollments" ON public.enrollments
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- LESSON_PROGRESS
CREATE POLICY "Students can manage own lesson progress" ON public.lesson_progress
  FOR ALL TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

-- ASSESSMENTS
CREATE POLICY "Teachers can CRUD assessments of own courses" ON public.assessments
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.courses WHERE courses.id = assessments.course_id AND courses.teacher_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.courses WHERE courses.id = assessments.course_id AND courses.teacher_id = auth.uid()));

CREATE POLICY "Enrolled students can view published assessments" ON public.assessments
  FOR SELECT TO authenticated
  USING (
    is_published = true
    AND EXISTS (SELECT 1 FROM public.enrollments WHERE enrollments.course_id = assessments.course_id AND enrollments.student_id = auth.uid())
  );

-- QUESTIONS
CREATE POLICY "Teachers can CRUD questions of own assessments" ON public.questions
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.assessments a
    JOIN public.courses c ON c.id = a.course_id
    WHERE a.id = questions.assessment_id AND c.teacher_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.assessments a
    JOIN public.courses c ON c.id = a.course_id
    WHERE a.id = questions.assessment_id AND c.teacher_id = auth.uid()
  ));

CREATE POLICY "Students can view questions of published assessments" ON public.questions
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.assessments a
    JOIN public.enrollments e ON e.course_id = a.course_id
    WHERE a.id = questions.assessment_id AND a.is_published = true AND e.student_id = auth.uid()
  ));

-- ASSESSMENT_ATTEMPTS
CREATE POLICY "Students can manage own attempts" ON public.assessment_attempts
  FOR ALL TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Teachers can view attempts for own courses" ON public.assessment_attempts
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.assessments a
    JOIN public.courses c ON c.id = a.course_id
    WHERE a.id = assessment_attempts.assessment_id AND c.teacher_id = auth.uid()
  ));

-- ATTEMPT_RESPONSES
CREATE POLICY "Students can manage own responses" ON public.attempt_responses
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.assessment_attempts att WHERE att.id = attempt_responses.attempt_id AND att.student_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.assessment_attempts att WHERE att.id = attempt_responses.attempt_id AND att.student_id = auth.uid()));

CREATE POLICY "Teachers can view responses for own courses" ON public.attempt_responses
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.assessment_attempts att
    JOIN public.assessments a ON a.id = att.assessment_id
    JOIN public.courses c ON c.id = a.course_id
    WHERE att.id = attempt_responses.attempt_id AND c.teacher_id = auth.uid()
  ));
