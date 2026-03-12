
CREATE OR REPLACE FUNCTION public.notify_on_lesson_created()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  _course_title TEXT;
  _is_published BOOLEAN;
  _student RECORD;
BEGIN
  SELECT c.title, c.is_published INTO _course_title, _is_published
  FROM public.courses c WHERE c.id = NEW.course_id;

  IF _is_published = false THEN
    RETURN NEW;
  END IF;

  FOR _student IN
    SELECT e.student_id FROM public.enrollments e WHERE e.course_id = NEW.course_id
  LOOP
    INSERT INTO public.notifications (user_id, title, message, metadata)
    VALUES (
      _student.student_id,
      'New Lesson Available',
      'A new lesson "' || NEW.title || '" has been added to ' || COALESCE(_course_title, 'your course'),
      jsonb_build_object('type', 'lesson_created', 'lesson_id', NEW.id, 'course_id', NEW.course_id)
    );
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_lesson_created
  AFTER INSERT ON public.lessons
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_lesson_created();
