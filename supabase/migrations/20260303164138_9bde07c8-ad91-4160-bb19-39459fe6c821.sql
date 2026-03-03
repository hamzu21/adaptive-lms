
CREATE OR REPLACE FUNCTION public.notify_on_live_class_scheduled()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _course_title TEXT;
  _student RECORD;
BEGIN
  SELECT c.title INTO _course_title FROM public.courses c WHERE c.id = NEW.course_id;

  FOR _student IN
    SELECT e.student_id FROM public.enrollments e WHERE e.course_id = NEW.course_id
  LOOP
    INSERT INTO public.notifications (user_id, title, message, metadata)
    VALUES (
      _student.student_id,
      'Live Class Scheduled',
      '"' || NEW.title || '" scheduled for ' || to_char(NEW.scheduled_at AT TIME ZONE 'UTC', 'Mon DD, YYYY HH12:MI AM') || ' (UTC) in ' || COALESCE(_course_title, 'your course'),
      jsonb_build_object('type', 'live_class_scheduled', 'live_class_id', NEW.id, 'course_id', NEW.course_id, 'scheduled_at', NEW.scheduled_at)
    );
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_live_class_scheduled
AFTER INSERT ON public.live_classes
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_live_class_scheduled();
