-- Add expertise/bio field to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS expertise text NOT NULL DEFAULT '';
