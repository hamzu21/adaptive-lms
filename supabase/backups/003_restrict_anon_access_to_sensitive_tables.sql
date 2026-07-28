-- Deny unauthenticated (anon) SELECT access to all sensitive tables
CREATE POLICY "Deny anon access" ON public.parent_invite_codes FOR SELECT TO anon USING (false);
CREATE POLICY "Deny anon access" ON public.courses FOR SELECT TO anon USING (false);
CREATE POLICY "Deny anon access" ON public.enrollments FOR SELECT TO anon USING (false);
CREATE POLICY "Deny anon access" ON public.assessments FOR SELECT TO anon USING (false);
CREATE POLICY "Deny anon access" ON public.questions FOR SELECT TO anon USING (false);
CREATE POLICY "Deny anon access" ON public.assessment_attempts FOR SELECT TO anon USING (false);
CREATE POLICY "Deny anon access" ON public.attempt_responses FOR SELECT TO anon USING (false);
CREATE POLICY "Deny anon access" ON public.assignments FOR SELECT TO anon USING (false);
CREATE POLICY "Deny anon access" ON public.assignment_submissions FOR SELECT TO anon USING (false);
CREATE POLICY "Deny anon access" ON public.lessons FOR SELECT TO anon USING (false);
CREATE POLICY "Deny anon access" ON public.lesson_progress FOR SELECT TO anon USING (false);
CREATE POLICY "Deny anon access" ON public.student_feedback FOR SELECT TO anon USING (false);
CREATE POLICY "Deny anon access" ON public.student_notes FOR SELECT TO anon USING (false);
CREATE POLICY "Deny anon access" ON public.chat_conversations FOR SELECT TO anon USING (false);
CREATE POLICY "Deny anon access" ON public.chat_messages FOR SELECT TO anon USING (false);
CREATE POLICY "Deny anon access" ON public.notifications FOR SELECT TO anon USING (false);