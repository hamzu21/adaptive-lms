
-- 1. Create a sequence for roll numbers
CREATE SEQUENCE IF NOT EXISTS public.roll_number_seq START 1001;

-- 2. Add roll_number column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS roll_number TEXT UNIQUE;

-- 3. Update handle_new_user function to auto-assign roll numbers to students
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_student BOOLEAN;
  new_roll_number TEXT;
BEGIN
  -- Check if user is a student
  is_student := COALESCE(NEW.raw_user_meta_data->>'role', 'student') = 'student';
  
  -- Generate roll number only for students
  IF is_student THEN
    new_roll_number := 'STU-' || nextval('public.roll_number_seq')::text;
  ELSE
    new_roll_number := NULL;
  END IF;

  INSERT INTO public.profiles (user_id, full_name, roll_number)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    new_roll_number
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id, 
    COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'student')
  );
  
  RETURN NEW;
END;
$$;

-- 4. Backfill existing students with roll numbers if they don't have one
DO $$
DECLARE
  profile_record RECORD;
BEGIN
  FOR profile_record IN 
    SELECT p.user_id 
    FROM public.profiles p
    JOIN public.user_roles ur ON p.user_id = ur.user_id
    WHERE ur.role = 'student' AND p.roll_number IS NULL
  LOOP
    UPDATE public.profiles 
    SET roll_number = 'STU-' || nextval('public.roll_number_seq')::text
    WHERE user_id = profile_record.user_id;
  END LOOP;
END $$;

-- 5. Add RLS policy for Teachers to view profiles (needed for enrollment search)
CREATE POLICY "Teachers can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'teacher'));
