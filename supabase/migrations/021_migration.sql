
-- Create a safe RPC that returns questions WITHOUT correct_option
CREATE OR REPLACE FUNCTION public.get_quiz_questions(_assessment_id UUID)
RETURNS TABLE (
  out_id UUID,
  out_question_text TEXT,
  out_options JSONB,
  out_marks INTEGER,
  out_position INTEGER,
  out_difficulty TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM assessments a
    WHERE a.id = _assessment_id
      AND a.is_published = true
      AND is_enrolled(auth.uid(), a.course_id)
  ) THEN
    RAISE EXCEPTION 'Not authorized to view these questions';
  END IF;

  RETURN QUERY
  SELECT q.id, q.question_text, q.options, q.marks, q.position, q.difficulty
  FROM questions q
  WHERE q.assessment_id = _assessment_id
  ORDER BY q.position ASC;
END;
$$;

-- Drop the student SELECT policy that exposes correct_option
DROP POLICY IF EXISTS "Students can view questions of published assessments" ON public.questions;
