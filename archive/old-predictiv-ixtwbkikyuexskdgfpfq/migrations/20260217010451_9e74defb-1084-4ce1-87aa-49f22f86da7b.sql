
-- Grant admin role to system owner accounts
INSERT INTO public.user_roles (user_id, role) VALUES
  ('675cf687-785f-447b-b4da-42a8437bb69c', 'admin'),
  ('125ca6dd-715f-4c65-9d83-39ea06978884', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
