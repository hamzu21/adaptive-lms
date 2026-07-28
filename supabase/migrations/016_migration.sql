
-- Create feedback table for courses and lessons
CREATE TABLE public.student_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, course_id, lesson_id)
);

-- Enable RLS
ALTER TABLE public.student_feedback ENABLE ROW LEVEL SECURITY;

-- Students can manage their own feedback
CREATE POLICY "Students can manage own feedback"
ON public.student_feedback
FOR ALL
USING (student_id = auth.uid())
WITH CHECK (student_id = auth.uid());

-- Teachers can view feedback for their courses
CREATE POLICY "Teachers can view feedback for own courses"
ON public.student_feedback
FOR SELECT
USING (is_course_teacher(auth.uid(), course_id));

-- Admins can view all feedback
CREATE POLICY "Admins can view all feedback"
ON public.student_feedback
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_student_feedback_updated_at
BEFORE UPDATE ON public.student_feedback
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();
