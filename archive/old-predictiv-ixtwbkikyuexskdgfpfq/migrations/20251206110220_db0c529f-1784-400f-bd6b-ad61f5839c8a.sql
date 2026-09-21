-- =====================================================
-- FIX REMAINING USER PROFILE TABLES AND CLEANUP
-- =====================================================

-- user_baselines
DROP POLICY IF EXISTS "Users can read their own baselines" ON public.user_baselines;
DROP POLICY IF EXISTS "Service role can do anything" ON public.user_baselines;
CREATE POLICY "Users can read their own baselines" ON public.user_baselines FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Service role can do anything" ON public.user_baselines FOR ALL TO service_role USING (true) WITH CHECK (true);

-- user_context_enhanced
DROP POLICY IF EXISTS "Users can view their own context" ON public.user_context_enhanced;
DROP POLICY IF EXISTS "Users can update their own context" ON public.user_context_enhanced;
DROP POLICY IF EXISTS "Users can insert their own context" ON public.user_context_enhanced;
DROP POLICY IF EXISTS "Service role full access to user_context" ON public.user_context_enhanced;
CREATE POLICY "Users can view their own context" ON public.user_context_enhanced FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own context" ON public.user_context_enhanced FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own context" ON public.user_context_enhanced FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service role full access to user_context" ON public.user_context_enhanced FOR ALL TO service_role USING (true) WITH CHECK (true);

-- user_deviations
DROP POLICY IF EXISTS "Users can view their own deviations" ON public.user_deviations;
DROP POLICY IF EXISTS "Service role full access to deviations" ON public.user_deviations;
CREATE POLICY "Users can view their own deviations" ON public.user_deviations FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Service role full access to deviations" ON public.user_deviations FOR ALL TO service_role USING (true) WITH CHECK (true);

-- user_documents
DROP POLICY IF EXISTS "Users can view their own documents" ON public.user_documents;
DROP POLICY IF EXISTS "Users can insert their own documents" ON public.user_documents;
DROP POLICY IF EXISTS "Users can delete their own documents" ON public.user_documents;
DROP POLICY IF EXISTS "Service role full access to user_documents" ON public.user_documents;
CREATE POLICY "Users can view their own documents" ON public.user_documents FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own documents" ON public.user_documents FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own documents" ON public.user_documents FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Service role full access to user_documents" ON public.user_documents FOR ALL TO service_role USING (true) WITH CHECK (true);

-- user_health_profiles
DROP POLICY IF EXISTS "Users can view their own health profiles" ON public.user_health_profiles;
DROP POLICY IF EXISTS "Service role full access to health profiles" ON public.user_health_profiles;
CREATE POLICY "Users can view their own health profiles" ON public.user_health_profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Service role full access to health profiles" ON public.user_health_profiles FOR ALL TO service_role USING (true) WITH CHECK (true);

-- user_injuries
DROP POLICY IF EXISTS "Users can view their own injury history" ON public.user_injuries;
DROP POLICY IF EXISTS "Users can insert their own injury history" ON public.user_injuries;
DROP POLICY IF EXISTS "Users can update their own injury history" ON public.user_injuries;
CREATE POLICY "Users can view their own injury history" ON public.user_injuries FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own injury history" ON public.user_injuries FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own injury history" ON public.user_injuries FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- user_interests
DROP POLICY IF EXISTS "Users can view their own interests" ON public.user_interests;
DROP POLICY IF EXISTS "Users can insert their own interests" ON public.user_interests;
DROP POLICY IF EXISTS "Users can update their own interests" ON public.user_interests;
CREATE POLICY "Users can view their own interests" ON public.user_interests FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own interests" ON public.user_interests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own interests" ON public.user_interests FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- user_lifestyle
DROP POLICY IF EXISTS "Users can view their own lifestyle" ON public.user_lifestyle;
DROP POLICY IF EXISTS "Users can insert their own lifestyle" ON public.user_lifestyle;
DROP POLICY IF EXISTS "Users can update their own lifestyle" ON public.user_lifestyle;
CREATE POLICY "Users can view their own lifestyle" ON public.user_lifestyle FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own lifestyle" ON public.user_lifestyle FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own lifestyle" ON public.user_lifestyle FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- user_medical
DROP POLICY IF EXISTS "Users can view their own medical background" ON public.user_medical;
DROP POLICY IF EXISTS "Users can insert their own medical background" ON public.user_medical;
DROP POLICY IF EXISTS "Users can update their own medical background" ON public.user_medical;
CREATE POLICY "Users can view their own medical background" ON public.user_medical FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own medical background" ON public.user_medical FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own medical background" ON public.user_medical FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- user_mindset
DROP POLICY IF EXISTS "Users can view their own mindset data" ON public.user_mindset;
DROP POLICY IF EXISTS "Users can insert their own mindset data" ON public.user_mindset;
DROP POLICY IF EXISTS "Users can update their own mindset data" ON public.user_mindset;
CREATE POLICY "Users can view their own mindset data" ON public.user_mindset FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own mindset data" ON public.user_mindset FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own mindset data" ON public.user_mindset FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- user_nutrition
DROP POLICY IF EXISTS "Users can view their own nutrition" ON public.user_nutrition;
DROP POLICY IF EXISTS "Users can insert their own nutrition" ON public.user_nutrition;
DROP POLICY IF EXISTS "Users can update their own nutrition" ON public.user_nutrition;
CREATE POLICY "Users can view their own nutrition" ON public.user_nutrition FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own nutrition" ON public.user_nutrition FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own nutrition" ON public.user_nutrition FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- user_profile
DROP POLICY IF EXISTS "read own profile" ON public.user_profile;
DROP POLICY IF EXISTS "update own profile" ON public.user_profile;
DROP POLICY IF EXISTS "upsert own profile" ON public.user_profile;
CREATE POLICY "Users can view their own profile" ON public.user_profile FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.user_profile FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.user_profile FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- user_recovery
DROP POLICY IF EXISTS "Users can view their own recovery data" ON public.user_recovery;
DROP POLICY IF EXISTS "Users can insert their own recovery data" ON public.user_recovery;
DROP POLICY IF EXISTS "Users can update their own recovery data" ON public.user_recovery;
CREATE POLICY "Users can view their own recovery data" ON public.user_recovery FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own recovery data" ON public.user_recovery FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own recovery data" ON public.user_recovery FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- user_training
DROP POLICY IF EXISTS "Users can view their own training preferences" ON public.user_training;
DROP POLICY IF EXISTS "Users can insert their own training preferences" ON public.user_training;
DROP POLICY IF EXISTS "Users can update their own training preferences" ON public.user_training;
CREATE POLICY "Users can view their own training preferences" ON public.user_training FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own training preferences" ON public.user_training FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own training preferences" ON public.user_training FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- user_wellness_goals
DROP POLICY IF EXISTS "Users can view their own wellness goals" ON public.user_wellness_goals;
DROP POLICY IF EXISTS "Users can insert their own wellness goals" ON public.user_wellness_goals;
DROP POLICY IF EXISTS "Users can update their own wellness goals" ON public.user_wellness_goals;
CREATE POLICY "Users can view their own wellness goals" ON public.user_wellness_goals FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own wellness goals" ON public.user_wellness_goals FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own wellness goals" ON public.user_wellness_goals FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- yves_memory_bank
DROP POLICY IF EXISTS "Users can view their own memory" ON public.yves_memory_bank;
DROP POLICY IF EXISTS "Users can insert their own memory" ON public.yves_memory_bank;
DROP POLICY IF EXISTS "Service role full access to memory" ON public.yves_memory_bank;
CREATE POLICY "Users can view their own memory" ON public.yves_memory_bank FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Service role full access to memory" ON public.yves_memory_bank FOR ALL TO service_role USING (true) WITH CHECK (true);

-- yves_profiles
DROP POLICY IF EXISTS "Users can view their own yves profile" ON public.yves_profiles;
DROP POLICY IF EXISTS "Service role full access to yves profiles" ON public.yves_profiles;
CREATE POLICY "Users can view their own yves profile" ON public.yves_profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Service role full access to yves profiles" ON public.yves_profiles FOR ALL TO service_role USING (true) WITH CHECK (true);

-- yves_recommendations
DROP POLICY IF EXISTS "Users can view their own recommendations" ON public.yves_recommendations;
DROP POLICY IF EXISTS "Service role full access to recommendations" ON public.yves_recommendations;
CREATE POLICY "Users can view their own yves recommendations" ON public.yves_recommendations FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Service role full access to yves recommendations" ON public.yves_recommendations FOR ALL TO service_role USING (true) WITH CHECK (true);