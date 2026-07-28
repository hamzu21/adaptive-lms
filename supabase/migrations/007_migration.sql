
CREATE POLICY "Teachers can view enrolled student profiles"
ON public.profiles
FOR SELECT
USING (
  has_role(auth.uid(), 'teacher'::app_role)
  AND EXISTS (
    SELECT 1 FROM enrollments e
    JOIN courses c ON c.id = e.course_id
    WHERE c.teacher_id = auth.uid()
    AND e.student_id = profiles.user_id
  )
);
