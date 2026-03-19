
CREATE OR REPLACE FUNCTION public.notify_on_assignment_submission()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  _assignment_title TEXT;
  _course_title TEXT;
  _teacher_id UUID;
  _student_name TEXT;
BEGIN
  SELECT a.title, c.title, c.teacher_id INTO _assignment_title, _course_title, _teacher_id
  FROM public.assignments a
  JOIN public.courses c ON c.id = a.course_id
  WHERE a.id = NEW.assignment_id;

  SELECT p.full_name INTO _student_name
  FROM public.profiles p WHERE p.user_id = NEW.student_id;

  INSERT INTO public.notifications (user_id, title, message, metadata)
  VALUES (
    _teacher_id,
    'Assignment Submitted',
    COALESCE(_student_name, 'A student') || ' submitted "' || COALESCE(_assignment_title, 'an assignment') || '" in ' || COALESCE(_course_title, 'your course'),
    jsonb_build_object('type', 'assignment_submission', 'assignment_id', NEW.assignment_id, 'student_id', NEW.student_id)
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_assignment_submission
  AFTER INSERT ON public.assignment_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_assignment_submission();
