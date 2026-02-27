
-- Function to find a student by name for parent linking
CREATE OR REPLACE FUNCTION public.find_student_by_name(_name text)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id
  FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id = p.user_id
  WHERE ur.role = 'student'
    AND lower(p.full_name) = lower(_name)
  LIMIT 1
$$;
