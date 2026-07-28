
CREATE OR REPLACE FUNCTION public.notify_on_live_class_started()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _course_title TEXT;
  _teacher_name TEXT;
  _student RECORD;
BEGIN
  -- Only fire when status changes to 'live'
  IF OLD.status = 'live' OR NEW.status != 'live' THEN
    RETURN NEW;
  END IF;

  SELECT c.title INTO _course_title FROM public.courses c WHERE c.id = NEW.course_id;
  SELECT p.full_name INTO _teacher_name FROM public.profiles p WHERE p.user_id = NEW.teacher_id;

  FOR _student IN
    SELECT e.student_id FROM public.enrollments e WHERE e.course_id = NEW.course_id
  LOOP
    INSERT INTO public.notifications (user_id, title, message, metadata)
    VALUES (
      _student.student_id,
      '🔴 Live Class Started',
      '"' || NEW.title || '" is now live in ' || COALESCE(_course_title, 'your course') || '. Join now!',
      jsonb_build_object('type', 'live_class_started', 'live_class_id', NEW.id, 'course_id', NEW.course_id)
    );
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_live_class_started
AFTER UPDATE ON public.live_classes
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_live_class_started();
