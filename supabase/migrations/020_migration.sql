-- Deny unauthenticated access to profiles
CREATE POLICY "Deny unauthenticated access"
ON public.profiles
FOR SELECT
TO anon
USING (false);