
-- Trigger: notify enrolled students when an assignment is published
CREATE OR REPLACE FUNCTION public.notify_on_assignment_published()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  _course_title TEXT;
  _student RECORD;
BEGIN
  IF OLD.is_published = true OR NEW.is_published = false THEN
    RETURN NEW;
  END IF;

  SELECT c.title INTO _course_title
  FROM public.courses c WHERE c.id = NEW.course_id;

  FOR _student IN
    SELECT e.student_id FROM public.enrollments e WHERE e.course_id = NEW.course_id
  LOOP
    INSERT INTO public.notifications (user_id, title, message, metadata)
    VALUES (
      _student.student_id,
      'New Assignment Available',
      'A new assignment "' || NEW.title || '" is available in ' || COALESCE(_course_title, 'your course') ||
      CASE WHEN NEW.due_date IS NOT NULL THEN '. Due: ' || to_char(NEW.due_date AT TIME ZONE 'UTC', 'Mon DD, YYYY HH12:MI AM') || ' (UTC)' ELSE '' END,
      jsonb_build_object('type', 'assignment_published', 'assignment_id', NEW.id, 'course_id', NEW.course_id)
    );
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_assignment_published
  AFTER UPDATE ON public.assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_assignment_published();

-- Trigger: notify student when their assignment submission is graded
CREATE OR REPLACE FUNCTION public.notify_on_assignment_graded()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  _assignment_title TEXT;
  _course_title TEXT;
BEGIN
  IF OLD.graded_at IS NOT NULL OR NEW.graded_at IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT a.title, c.title INTO _assignment_title, _course_title
  FROM public.assignments a
  JOIN public.courses c ON c.id = a.course_id
  WHERE a.id = NEW.assignment_id;

  INSERT INTO public.notifications (user_id, title, message, metadata)
  VALUES (
    NEW.student_id,
    'Assignment Graded',
    'Your submission for "' || COALESCE(_assignment_title, 'an assignment') || '" in ' || COALESCE(_course_title, 'your course') ||
    ' has been graded' || CASE WHEN NEW.score IS NOT NULL THEN ' (Score: ' || NEW.score || ')' ELSE '' END,
    jsonb_build_object('type', 'assignment_graded', 'assignment_id', NEW.assignment_id, 'course_id', (SELECT course_id FROM public.assignments WHERE id = NEW.assignment_id))
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_assignment_graded
  AFTER UPDATE ON public.assignment_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_assignment_graded();
