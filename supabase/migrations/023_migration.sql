
-- Activity log table
CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  activity_type text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_activity_logs_user_id ON public.activity_logs (user_id);
CREATE INDEX idx_activity_logs_type ON public.activity_logs (activity_type);
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs (created_at DESC);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Students see own logs
CREATE POLICY "Students can view own activity"
  ON public.activity_logs FOR SELECT
  USING (user_id = auth.uid());

-- Students can insert own logs (for login tracking from client)
CREATE POLICY "Users can insert own activity"
  ON public.activity_logs FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Teachers see enrolled students' logs
CREATE POLICY "Teachers can view student activity"
  ON public.activity_logs FOR SELECT
  USING (
    has_role(auth.uid(), 'teacher'::app_role) AND
    EXISTS (
      SELECT 1 FROM enrollments e
      JOIN courses c ON c.id = e.course_id
      WHERE c.teacher_id = auth.uid() AND e.student_id = activity_logs.user_id
    )
  );

-- Admins see all
CREATE POLICY "Admins can view all activity"
  ON public.activity_logs FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Parents see children's logs
CREATE POLICY "Parents can view children activity"
  ON public.activity_logs FOR SELECT
  USING (
    has_role(auth.uid(), 'parent'::app_role) AND
    EXISTS (SELECT 1 FROM parent_children pc WHERE pc.parent_id = auth.uid() AND pc.child_id = activity_logs.user_id)
  );

-- Deny anon
CREATE POLICY "Deny anon access"
  ON public.activity_logs FOR SELECT
  USING (false);

-- Trigger: log lesson completion
CREATE OR REPLACE FUNCTION public.log_lesson_completion()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _lesson_title TEXT;
  _course_title TEXT;
BEGIN
  IF NEW.completed = true AND (OLD.completed = false OR OLD.completed IS NULL) THEN
    SELECT l.title, c.title INTO _lesson_title, _course_title
    FROM lessons l JOIN courses c ON c.id = l.course_id
    WHERE l.id = NEW.lesson_id;

    INSERT INTO activity_logs (user_id, activity_type, metadata)
    VALUES (NEW.student_id, 'lesson_completed', jsonb_build_object(
      'lesson_id', NEW.lesson_id,
      'lesson_title', _lesson_title,
      'course_title', _course_title
    ));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_lesson_completion
  AFTER INSERT OR UPDATE ON public.lesson_progress
  FOR EACH ROW EXECUTE FUNCTION public.log_lesson_completion();

-- Trigger: log quiz attempt completion
CREATE OR REPLACE FUNCTION public.log_quiz_attempt()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _assessment_title TEXT;
  _course_title TEXT;
BEGIN
  IF OLD.completed_at IS NULL AND NEW.completed_at IS NOT NULL THEN
    SELECT a.title, c.title INTO _assessment_title, _course_title
    FROM assessments a JOIN courses c ON c.id = a.course_id
    WHERE a.id = NEW.assessment_id;

    INSERT INTO activity_logs (user_id, activity_type, metadata)
    VALUES (NEW.student_id, 'quiz_completed', jsonb_build_object(
      'assessment_id', NEW.assessment_id,
      'assessment_title', _assessment_title,
      'course_title', _course_title,
      'score', NEW.score,
      'total_marks', NEW.total_marks
    ));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_quiz_attempt
  AFTER UPDATE ON public.assessment_attempts
  FOR EACH ROW EXECUTE FUNCTION public.log_quiz_attempt();
