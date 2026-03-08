-- ─── practitioners ────────────────────────────────────────────────────────────
-- Self-registered practitioners. Approved ones appear in Find Help.

CREATE TABLE IF NOT EXISTS public.practitioners (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name                  text NOT NULL,
  type                  text NOT NULL,
  location_city         text,
  location_suburb       text,
  bio                   text CHECK (char_length(bio) <= 300),
  specialisations       text[] DEFAULT '{}',
  fee_per_session       integer,
  accepts_medical_aid   boolean DEFAULT false,
  telehealth_available  boolean DEFAULT false,
  phone                 text,
  contact_email         text,
  profile_status        text NOT NULL DEFAULT 'pending_review'
                          CHECK (profile_status IN ('pending_review', 'approved', 'suspended')),
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_practitioners_status   ON public.practitioners(profile_status);
CREATE INDEX IF NOT EXISTS idx_practitioners_user_id  ON public.practitioners(user_id);

ALTER TABLE public.practitioners ENABLE ROW LEVEL SECURITY;

-- Public can read approved practitioners (used in Find Help — unauthenticated ok)
CREATE POLICY "Public can view approved practitioners"
  ON public.practitioners FOR SELECT
  USING (profile_status = 'approved');

-- Practitioners can read their own row (any status)
CREATE POLICY "Practitioners can read own row"
  ON public.practitioners FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Practitioners can insert their own row
CREATE POLICY "Practitioners can insert own profile"
  ON public.practitioners FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Practitioners can update their own row (but NOT profile_status)
CREATE POLICY "Practitioners can update own profile"
  ON public.practitioners FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins can read and update any row (for approval workflow)
CREATE POLICY "Admins can manage practitioners"
  ON public.practitioners FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
  );

-- updated_at trigger
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_practitioners_updated_at'
  ) THEN
    CREATE TRIGGER update_practitioners_updated_at
      BEFORE UPDATE ON public.practitioners
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ─── practitioner_bookings ────────────────────────────────────────────────────
-- Logged every time a user taps "Book" on a practitioner card in Find Help.

CREATE TABLE IF NOT EXISTS public.practitioner_bookings (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id   uuid REFERENCES public.practitioners(id) ON DELETE SET NULL,
  patient_user_id   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  booked_at         timestamptz DEFAULT now(),
  source            text DEFAULT 'find_help'
                      CHECK (source IN ('find_help', 'direct')),
  status            text DEFAULT 'pending'
                      CHECK (status IN ('pending', 'confirmed', 'completed'))
);

CREATE INDEX IF NOT EXISTS idx_bookings_practitioner ON public.practitioner_bookings(practitioner_id);
CREATE INDEX IF NOT EXISTS idx_bookings_patient      ON public.practitioner_bookings(patient_user_id);

ALTER TABLE public.practitioner_bookings ENABLE ROW LEVEL SECURITY;

-- Patients can insert bookings for themselves
CREATE POLICY "Patients can create bookings"
  ON public.practitioner_bookings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = patient_user_id);

-- Patients can see their own bookings
CREATE POLICY "Patients can read own bookings"
  ON public.practitioner_bookings FOR SELECT
  TO authenticated
  USING (auth.uid() = patient_user_id);

-- Practitioners can read bookings for their profile
CREATE POLICY "Practitioners can read own bookings"
  ON public.practitioner_bookings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.practitioners
      WHERE practitioners.id = practitioner_bookings.practitioner_id
        AND practitioners.user_id = auth.uid()
    )
  );

-- Admins full access
CREATE POLICY "Admins can manage bookings"
  ON public.practitioner_bookings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
  );
