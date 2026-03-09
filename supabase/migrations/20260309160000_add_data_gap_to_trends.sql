-- Add data_gap flag to recovery_trends and training_trends.
-- true when fewer than 5 of the 7-day acute window have wearable data.
-- The frontend uses this to show a visual break in charts rather than
-- a misleading flat line at zero.

alter table public.recovery_trends
  add column if not exists data_gap boolean not null default false;

alter table public.training_trends
  add column if not exists data_gap boolean not null default false;
