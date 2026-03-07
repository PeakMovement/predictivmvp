-- ─── PRACTITIONER ACCESS TABLE ────────────────────────────────────────────────
-- Stores which practitioners have read-only access to which patients.
-- Patients grant access; practitioners accept by viewing the dashboard.

create table if not exists public.practitioner_access (
  id                  uuid primary key default gen_random_uuid(),
  practitioner_id     uuid references auth.users(id) on delete cascade,
  patient_id          uuid not null references auth.users(id) on delete cascade,
  practitioner_email  text not null,
  practitioner_name   text,
  practitioner_type   text check (practitioner_type in ('physio','coach','doctor','trainer','other')),
  access_granted_at   timestamptz not null default now(),
  is_active           boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists practitioner_access_practitioner_idx on public.practitioner_access(practitioner_id);
create index if not exists practitioner_access_patient_idx     on public.practitioner_access(patient_id);
create index if not exists practitioner_access_email_idx       on public.practitioner_access(practitioner_email);

-- Prevent duplicate active access grants
create unique index if not exists practitioner_access_unique_active
  on public.practitioner_access(practitioner_email, patient_id)
  where is_active = true;

-- ─── RLS ──────────────────────────────────────────────────────────────────────
alter table public.practitioner_access enable row level security;

-- Patients can read their own access grants
create policy "patients_read_own_grants"
  on public.practitioner_access for select
  using (patient_id = auth.uid());

-- Patients can insert access grants for their own record
create policy "patients_insert_grants"
  on public.practitioner_access for insert
  with check (patient_id = auth.uid());

-- Patients can revoke (update is_active = false) their own grants
create policy "patients_update_own_grants"
  on public.practitioner_access for update
  using (patient_id = auth.uid());

-- Practitioners can read rows where their auth uid is the practitioner_id
create policy "practitioners_read_own_access"
  on public.practitioner_access for select
  using (practitioner_id = auth.uid());

-- ─── PRACTITIONER READ POLICIES ON PATIENT DATA TABLES ────────────────────────
-- Allow practitioners to read patient data for their linked patients.
-- We check for an active practitioner_access row to gate access.

-- wearable_sessions
create policy "practitioner_read_patient_wearable_sessions"
  on public.wearable_sessions for select
  using (
    exists (
      select 1 from public.practitioner_access pa
      where pa.practitioner_id = auth.uid()
        and pa.patient_id = wearable_sessions.user_id
        and pa.is_active = true
    )
  );

-- user_injury_profiles
create policy "practitioner_read_patient_injury_profiles"
  on public.user_injury_profiles for select
  using (
    exists (
      select 1 from public.practitioner_access pa
      where pa.practitioner_id = auth.uid()
        and pa.patient_id = user_injury_profiles.user_id
        and pa.is_active = true
    )
  );

-- health_anomalies
create policy "practitioner_read_patient_health_anomalies"
  on public.health_anomalies for select
  using (
    exists (
      select 1 from public.practitioner_access pa
      where pa.practitioner_id = auth.uid()
        and pa.patient_id = health_anomalies.user_id
        and pa.is_active = true
    )
  );

-- yves_recommendations
create policy "practitioner_read_patient_recommendations"
  on public.yves_recommendations for select
  using (
    exists (
      select 1 from public.practitioner_access pa
      where pa.practitioner_id = auth.uid()
        and pa.patient_id = yves_recommendations.user_id
        and pa.is_active = true
    )
  );

-- user_profiles (name lookup)
create policy "practitioner_read_patient_profiles"
  on public.user_profiles for select
  using (
    exists (
      select 1 from public.practitioner_access pa
      where pa.practitioner_id = auth.uid()
        and pa.patient_id = user_profiles.user_id
        and pa.is_active = true
    )
  );

-- training_trends (HRV trend sparkline)
create policy "practitioner_read_patient_training_trends"
  on public.training_trends for select
  using (
    exists (
      select 1 from public.practitioner_access pa
      where pa.practitioner_id = auth.uid()
        and pa.patient_id = training_trends.user_id
        and pa.is_active = true
    )
  );

-- ─── UPDATED_AT TRIGGER ───────────────────────────────────────────────────────
create or replace function public.set_practitioner_access_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger practitioner_access_updated_at
  before update on public.practitioner_access
  for each row execute function public.set_practitioner_access_updated_at();
