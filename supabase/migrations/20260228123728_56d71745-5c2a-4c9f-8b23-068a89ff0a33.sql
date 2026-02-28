
-- Trigger: notify enrolled students when an assessment is published
CREATE OR REPLACE FUNCTION public.notify_on_assessment_published()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  _course_title TEXT;
  _student RECORD;
BEGIN
  -- Only fire when is_published changes from false to true
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
      'New Assessment Available',
      'A new assessment "' || NEW.title || '" is available in ' || COALESCE(_course_title, 'your course'),
      jsonb_build_object('type', 'assessment_published', 'assessment_id', NEW.id, 'course_id', NEW.course_id)
    );
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_assessment_published
  AFTER UPDATE ON public.assessments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_assessment_published();

-- Trigger: notify enrolled students when a course is updated (title/description/subject change)
CREATE OR REPLACE FUNCTION public.notify_on_course_updated()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  _student RECORD;
BEGIN
  -- Only fire on meaningful content changes, not just updated_at
  IF OLD.title = NEW.title AND OLD.description = NEW.description AND OLD.subject = NEW.subject THEN
    RETURN NEW;
  END IF;

  -- Only notify for published courses
  IF NEW.is_published = false THEN
    RETURN NEW;
  END IF;

  FOR _student IN
    SELECT e.student_id FROM public.enrollments e WHERE e.course_id = NEW.id
  LOOP
    INSERT INTO public.notifications (user_id, title, message, metadata)
    VALUES (
      _student.student_id,
      'Course Updated',
      '"' || NEW.title || '" has been updated by your teacher',
      jsonb_build_object('type', 'course_updated', 'course_id', NEW.id)
    );
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_course_updated
  AFTER UPDATE ON public.courses
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_course_updated();

-- Trigger: notify student when they are enrolled in a course (by teacher)
CREATE OR REPLACE FUNCTION public.notify_student_on_enrollment()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  _course_title TEXT;
  _teacher_name TEXT;
BEGIN
  SELECT c.title, p.full_name INTO _course_title, _teacher_name
  FROM public.courses c
  LEFT JOIN public.profiles p ON p.user_id = c.teacher_id
  WHERE c.id = NEW.course_id;

  INSERT INTO public.notifications (user_id, title, message, metadata)
  VALUES (
    NEW.student_id,
    'Enrolled in Course',
    'You have been enrolled in "' || COALESCE(_course_title, 'a course') || '"' ||
    CASE WHEN _teacher_name IS NOT NULL THEN ' by ' || _teacher_name ELSE '' END,
    jsonb_build_object('type', 'enrolled', 'course_id', NEW.course_id)
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_student_enrollment
  AFTER INSERT ON public.enrollments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_student_on_enrollment();
