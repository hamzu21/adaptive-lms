
-- Add video columns to lessons
ALTER TABLE public.lessons
ADD COLUMN video_url text DEFAULT '' NOT NULL,
ADD COLUMN video_file_url text DEFAULT '' NOT NULL;

-- Create storage bucket for lesson videos
INSERT INTO storage.buckets (id, name, public) VALUES ('lesson-videos', 'lesson-videos', true);

-- Storage policies for lesson videos
CREATE POLICY "Teachers can upload lesson videos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'lesson-videos' AND has_role(auth.uid(), 'teacher'::app_role));

CREATE POLICY "Teachers can update lesson videos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'lesson-videos' AND has_role(auth.uid(), 'teacher'::app_role));

CREATE POLICY "Teachers can delete lesson videos"
ON storage.objects FOR DELETE
USING (bucket_id = 'lesson-videos' AND has_role(auth.uid(), 'teacher'::app_role));

CREATE POLICY "Anyone can view lesson videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'lesson-videos');
