
-- Parent-child linking table
CREATE TABLE public.parent_children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL,
  child_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(parent_id, child_id)
);

ALTER TABLE public.parent_children ENABLE ROW LEVEL SECURITY;

-- Parents can view their own links
CREATE POLICY "Parents can view own children links"
  ON public.parent_children FOR SELECT TO authenticated
  USING (parent_id = auth.uid());

-- Parents can add children
CREATE POLICY "Parents can add children"
  ON public.parent_children FOR INSERT TO authenticated
  WITH CHECK (parent_id = auth.uid() AND has_role(auth.uid(), 'parent'::app_role));

-- Parents can remove children
CREATE POLICY "Parents can remove children"
  ON public.parent_children FOR DELETE TO authenticated
  USING (parent_id = auth.uid());

-- Admins can view all
CREATE POLICY "Admins can view all parent_children"
  ON public.parent_children FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow parents to view profiles of their linked children
CREATE POLICY "Parents can view linked children profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'parent'::app_role) AND
    EXISTS (
      SELECT 1 FROM public.parent_children pc
      WHERE pc.parent_id = auth.uid() AND pc.child_id = profiles.user_id
    )
  );

-- Allow parents to view enrollments of their children
CREATE POLICY "Parents can view children enrollments"
  ON public.enrollments FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'parent'::app_role) AND
    EXISTS (
      SELECT 1 FROM public.parent_children pc
      WHERE pc.parent_id = auth.uid() AND pc.child_id = enrollments.student_id
    )
  );

-- Allow parents to view courses their children are enrolled in
CREATE POLICY "Parents can view children courses"
  ON public.courses FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'parent'::app_role) AND
    EXISTS (
      SELECT 1 FROM public.parent_children pc
      JOIN public.enrollments e ON e.student_id = pc.child_id
      WHERE pc.parent_id = auth.uid() AND e.course_id = courses.id
    )
  );

-- Allow parents to view lesson progress of their children
CREATE POLICY "Parents can view children lesson progress"
  ON public.lesson_progress FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'parent'::app_role) AND
    EXISTS (
      SELECT 1 FROM public.parent_children pc
      WHERE pc.parent_id = auth.uid() AND pc.child_id = lesson_progress.student_id
    )
  );

-- Allow parents to view assessment attempts of their children
CREATE POLICY "Parents can view children attempts"
  ON public.assessment_attempts FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'parent'::app_role) AND
    EXISTS (
      SELECT 1 FROM public.parent_children pc
      WHERE pc.parent_id = auth.uid() AND pc.child_id = assessment_attempts.student_id
    )
  );

-- Allow parents to view assessments of courses their children are enrolled in
CREATE POLICY "Parents can view children assessments"
  ON public.assessments FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'parent'::app_role) AND
    EXISTS (
      SELECT 1 FROM public.parent_children pc
      JOIN public.enrollments e ON e.student_id = pc.child_id
      WHERE pc.parent_id = auth.uid() AND e.course_id = assessments.course_id
    )
  );

-- Allow parents to view lessons of courses their children are enrolled in
CREATE POLICY "Parents can view children lessons"
  ON public.lessons FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'parent'::app_role) AND
    EXISTS (
      SELECT 1 FROM public.parent_children pc
      JOIN public.enrollments e ON e.student_id = pc.child_id
      WHERE pc.parent_id = auth.uid() AND e.course_id = lessons.course_id
    )
  );

-- Allow parents to view roles of their linked children
CREATE POLICY "Parents can view children roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'parent'::app_role) AND
    EXISTS (
      SELECT 1 FROM public.parent_children pc
      WHERE pc.parent_id = auth.uid() AND pc.child_id = user_roles.user_id
    )
  );
