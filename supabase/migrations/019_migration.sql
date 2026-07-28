-- Create parent invite codes table
CREATE TABLE public.parent_invite_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid NOT NULL,
  code text NOT NULL UNIQUE,
  expires_at timestamp with time zone NOT NULL,
  used_by uuid DEFAULT NULL,
  used_at timestamp with time zone DEFAULT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.parent_invite_codes ENABLE ROW LEVEL SECURITY;

-- Students can create and view their own codes
CREATE POLICY "Students can insert own invite codes"
ON public.parent_invite_codes
FOR INSERT
WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students can view own invite codes"
ON public.parent_invite_codes
FOR SELECT
USING (student_id = auth.uid());

-- Parents can view codes (needed to redeem)
CREATE POLICY "Parents can view unused codes"
ON public.parent_invite_codes
FOR SELECT
USING (has_role(auth.uid(), 'parent'::app_role) AND used_by IS NULL AND expires_at > now());

-- Parents can update code to mark as used
CREATE POLICY "Parents can redeem codes"
ON public.parent_invite_codes
FOR UPDATE
USING (has_role(auth.uid(), 'parent'::app_role) AND used_by IS NULL AND expires_at > now());

-- Create index for code lookup
CREATE INDEX idx_parent_invite_codes_code ON public.parent_invite_codes (code);
CREATE INDEX idx_parent_invite_codes_student ON public.parent_invite_codes (student_id);