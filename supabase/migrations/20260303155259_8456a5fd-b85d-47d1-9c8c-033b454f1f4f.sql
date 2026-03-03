
-- Create live_classes table for Jitsi Meet integration
CREATE TABLE public.live_classes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  jitsi_room_id TEXT NOT NULL,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'ended')),
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_live_classes_course ON public.live_classes(course_id);
CREATE INDEX idx_live_classes_teacher ON public.live_classes(teacher_id);
CREATE INDEX idx_live_classes_status ON public.live_classes(status);
CREATE INDEX idx_live_classes_scheduled ON public.live_classes(scheduled_at);

-- Enable RLS
ALTER TABLE public.live_classes ENABLE ROW LEVEL SECURITY;

-- Deny anon
CREATE POLICY "Deny anon access"
ON public.live_classes FOR SELECT
USING (false);

-- Teachers can CRUD own live classes
CREATE POLICY "Teachers can manage own live classes"
ON public.live_classes FOR ALL
USING (teacher_id = auth.uid() AND has_role(auth.uid(), 'teacher'))
WITH CHECK (teacher_id = auth.uid() AND has_role(auth.uid(), 'teacher'));

-- Enrolled students can view live classes
CREATE POLICY "Enrolled students can view live classes"
ON public.live_classes FOR SELECT
USING (is_enrolled(auth.uid(), course_id));

-- Parents can view children live classes
CREATE POLICY "Parents can view children live classes"
ON public.live_classes FOR SELECT
USING (
  has_role(auth.uid(), 'parent') AND EXISTS (
    SELECT 1 FROM parent_children pc
    JOIN enrollments e ON e.student_id = pc.child_id
    WHERE pc.parent_id = auth.uid() AND e.course_id = live_classes.course_id
  )
);

-- Admins can view all
CREATE POLICY "Admins can view all live classes"
ON public.live_classes FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Updated_at trigger
CREATE TRIGGER update_live_classes_updated_at
BEFORE UPDATE ON public.live_classes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Enable realtime for live class status updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_classes;
