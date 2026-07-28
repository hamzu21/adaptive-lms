
-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

-- Users can update own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid());

-- Users can delete own notifications
CREATE POLICY "Users can delete own notifications"
  ON public.notifications FOR DELETE
  USING (user_id = auth.uid());

-- System can insert notifications (via trigger with SECURITY DEFINER)
-- No INSERT policy needed since triggers use SECURITY DEFINER

-- Index for fast lookup
CREATE INDEX idx_notifications_user_id ON public.notifications (user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON public.notifications (user_id) WHERE read = false;

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Trigger function: notify teacher on new enrollment
CREATE OR REPLACE FUNCTION public.notify_on_enrollment()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  _course_title TEXT;
  _student_name TEXT;
  _teacher_id UUID;
BEGIN
  SELECT c.title, c.teacher_id INTO _course_title, _teacher_id
  FROM public.courses c WHERE c.id = NEW.course_id;

  SELECT p.full_name INTO _student_name
  FROM public.profiles p WHERE p.user_id = NEW.student_id;

  INSERT INTO public.notifications (user_id, title, message, metadata)
  VALUES (
    _teacher_id,
    'New Enrollment',
    COALESCE(_student_name, 'A student') || ' enrolled in ' || COALESCE(_course_title, 'your course'),
    jsonb_build_object('type', 'enrollment', 'course_id', NEW.course_id, 'student_id', NEW.student_id)
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_enrollment
  AFTER INSERT ON public.enrollments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_enrollment();

-- Trigger function: notify teacher on assessment submission
CREATE OR REPLACE FUNCTION public.notify_on_assessment_submission()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  _assessment_title TEXT;
  _student_name TEXT;
  _teacher_id UUID;
BEGIN
  -- Only fire when completed_at changes from NULL to a value
  IF OLD.completed_at IS NOT NULL OR NEW.completed_at IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT a.title, c.teacher_id INTO _assessment_title, _teacher_id
  FROM public.assessments a
  JOIN public.courses c ON c.id = a.course_id
  WHERE a.id = NEW.assessment_id;

  SELECT p.full_name INTO _student_name
  FROM public.profiles p WHERE p.user_id = NEW.student_id;

  INSERT INTO public.notifications (user_id, title, message, metadata)
  VALUES (
    _teacher_id,
    'Assessment Submitted',
    COALESCE(_student_name, 'A student') || ' completed ' || COALESCE(_assessment_title, 'an assessment') ||
    CASE WHEN NEW.score IS NOT NULL THEN ' (Score: ' || NEW.score || '/' || NEW.total_marks || ')' ELSE '' END,
    jsonb_build_object('type', 'assessment_submission', 'assessment_id', NEW.assessment_id, 'student_id', NEW.student_id, 'score', NEW.score)
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_assessment_submission
  AFTER UPDATE ON public.assessment_attempts
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_assessment_submission();
