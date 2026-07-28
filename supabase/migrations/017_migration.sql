-- Add difficulty level to questions table
ALTER TABLE public.questions 
ADD COLUMN difficulty text NOT NULL DEFAULT 'medium' 
CHECK (difficulty IN ('easy', 'medium', 'hard'));

-- Add adaptive tracking columns to assessment_attempts
ALTER TABLE public.assessment_attempts
ADD COLUMN is_adaptive boolean NOT NULL DEFAULT false,
ADD COLUMN difficulty_progression jsonb DEFAULT '[]'::jsonb;

-- Add difficulty_level to attempt_responses to track what difficulty was served
ALTER TABLE public.attempt_responses
ADD COLUMN difficulty_level text DEFAULT null;
