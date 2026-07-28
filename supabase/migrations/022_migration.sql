
-- Trigger function: notify parents when child scores below 50%
CREATE OR REPLACE FUNCTION public.notify_parent_on_low_score()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  _parent RECORD;
  _student_name TEXT;
  _assessment_title TEXT;
  _course_title TEXT;
  _score_pct INTEGER;
BEGIN
  -- Only fire when completed_at transitions from NULL to a value
  IF OLD.completed_at IS NOT NULL OR NEW.completed_at IS NULL THEN
    RETURN NEW;
  END IF;

  -- Only fire when score is below 50%
  IF NEW.score IS NULL OR NEW.total_marks IS NULL OR NEW.total_marks = 0 THEN
    RETURN NEW;
  END IF;

  _score_pct := ROUND((NEW.score::numeric / NEW.total_marks::numeric) * 100);

  IF _score_pct >= 50 THEN
    RETURN NEW;
  END IF;

  -- Get student name
  SELECT p.full_name INTO _student_name
  FROM public.profiles p WHERE p.user_id = NEW.student_id;

  -- Get assessment and course info
  SELECT a.title, c.title INTO _assessment_title, _course_title
  FROM public.assessments a
  JOIN public.courses c ON c.id = a.course_id
  WHERE a.id = NEW.assessment_id;

  -- Notify each linked parent
  FOR _parent IN
    SELECT pc.parent_id FROM public.parent_children pc WHERE pc.child_id = NEW.student_id
  LOOP
    INSERT INTO public.notifications (user_id, title, message, metadata)
    VALUES (
      _parent.parent_id,
      'Performance Alert',
      COALESCE(_student_name, 'Your child') || ' scored ' || _score_pct || '% on "' ||
      COALESCE(_assessment_title, 'an assessment') || '" in ' || COALESCE(_course_title, 'a course') ||
      '. Consider reviewing their progress.',
      jsonb_build_object(
        'type', 'low_score_alert',
        'student_id', NEW.student_id,
        'assessment_id', NEW.assessment_id,
        'score', NEW.score,
        'total_marks', NEW.total_marks,
        'score_percent', _score_pct
      )
    );
  END LOOP;

  RETURN NEW;
END;
$function$;

-- Attach trigger to assessment_attempts
CREATE TRIGGER trg_notify_parent_low_score
  AFTER UPDATE ON public.assessment_attempts
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_parent_on_low_score();
