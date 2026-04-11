-- Stream 3: Activity Preference Collection (M2 Sub-task 2)
-- Adds preferred_activities, excluded_activities, equipment_access, available_minutes
-- to user_interests table. These drive the Golden Rule: Yves only suggests activities
-- the user has expressed interest in, and never suggests excluded ones.

ALTER TABLE public.user_interests
  ADD COLUMN IF NOT EXISTS preferred_activities  text[]       DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS excluded_activities   text[]       DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS equipment_access      text[]       DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS available_minutes     integer,
  ADD COLUMN IF NOT EXISTS collected_at          timestamptz,
  ADD COLUMN IF NOT EXISTS collection_method     text
    CHECK (collection_method IN ('onboarding', 'briefing_question', 'chat_inferred'));
