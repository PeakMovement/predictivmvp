-- Add notification preference columns to user_profiles
alter table public.user_profiles
  add column if not exists briefing_enabled       boolean not null default true,
  add column if not exists briefing_time          text    not null default '07:00',
  add column if not exists alert_notifications_enabled boolean not null default true,
  add column if not exists weekly_summary_enabled boolean not null default true;

comment on column public.user_profiles.briefing_enabled            is 'Whether the user receives daily briefing emails';
comment on column public.user_profiles.briefing_time               is 'Preferred local time to receive daily briefing (HH:MM, 24h)';
comment on column public.user_profiles.alert_notifications_enabled is 'Whether the user receives risk alert emails';
comment on column public.user_profiles.weekly_summary_enabled      is 'Whether the user receives a weekly summary email on Sunday';
