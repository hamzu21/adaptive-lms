
-- Enable pg_net for HTTP calls from database
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Function to send email notification via edge function
CREATE OR REPLACE FUNCTION public.send_notification_email()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  _user_email TEXT;
  _supabase_url TEXT;
  _anon_key TEXT;
BEGIN
  -- Look up user email from auth.users
  SELECT email INTO _user_email
  FROM auth.users
  WHERE id = NEW.user_id;

  IF _user_email IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get project config
  _supabase_url := current_setting('app.settings.supabase_url', true);
  
  -- If setting not available, construct from project ref
  IF _supabase_url IS NULL OR _supabase_url = '' THEN
    _supabase_url := 'https://jvvmskukiriglrateaki.supabase.co';
  END IF;

  _anon_key := current_setting('app.settings.anon_key', true);
  IF _anon_key IS NULL OR _anon_key = '' THEN
    _anon_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2dm1za3VraXJpZ2xyYXRlYWtpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMDMzNTgsImV4cCI6MjA4Nzc3OTM1OH0.dXP7WNXA9QlD003_8Qq-mQPlU26KjZ5VaeDmFa1foF8';
  END IF;

  -- Call edge function via pg_net
  PERFORM extensions.http_post(
    url := _supabase_url || '/functions/v1/send-notification-email',
    body := jsonb_build_object(
      'user_email', _user_email,
      'title', NEW.title,
      'message', NEW.message,
      'type', NEW.metadata->>'type'
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || _anon_key
    )
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_send_notification_email
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.send_notification_email();
