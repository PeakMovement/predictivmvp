-- Risk Score History — persists daily composite risk scores for trend tracking and Yves context.
-- Calculated client-side in RiskScoreCard and upserted once per day per user.

create table if not exists public.risk_score_history (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  calculated_at     date not null default current_date,
  score             integer not null check (score between 0 and 100),
  -- Weighted component points that sum to score (for audit / Yves context)
  component_scores  jsonb not null default '{}',
  created_at        timestamptz not null default now(),
  unique (user_id, calculated_at)
);

create index if not exists risk_score_history_user_date_idx
  on public.risk_score_history(user_id, calculated_at desc);

alter table public.risk_score_history enable row level security;

create policy "users_manage_own_risk_scores"
  on public.risk_score_history
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
