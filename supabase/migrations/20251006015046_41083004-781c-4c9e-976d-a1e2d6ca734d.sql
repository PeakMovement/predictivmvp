-- Create NotificationLog table
CREATE TABLE public.notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  recipient TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('delivered', 'failed', 'queued'))
);

-- Enable Row Level Security
ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to view their own notifications
CREATE POLICY "Users can view their own notifications"
  ON public.notification_log
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Create policy to allow system to insert notifications
CREATE POLICY "System can insert notifications"
  ON public.notification_log
  FOR INSERT
  WITH CHECK (true);

-- Add index for faster queries by recipient
CREATE INDEX idx_notification_log_recipient ON public.notification_log(recipient);

-- Add index for faster queries by created_at
CREATE INDEX idx_notification_log_created_at ON public.notification_log(created_at DESC);