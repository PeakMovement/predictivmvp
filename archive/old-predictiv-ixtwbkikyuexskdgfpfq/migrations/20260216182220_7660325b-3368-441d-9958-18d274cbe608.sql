-- Insert realistic memory entries for user 125ca6dd to test memory-based personalization
-- These use direct INSERT since we're seeding test data, not altering schema

INSERT INTO yves_memory_bank (user_id, memory_key, memory_value, last_updated) VALUES
('125ca6dd-715f-4c65-9d83-39ea06978884', 'preferred_training', '"Enjoys trail running and cycling; avoids high-impact gym work due to past knee issue"', now()),
('125ca6dd-715f-4c65-9d83-39ea06978884', 'sleep_pattern', '"Tends to sleep poorly on Sunday nights; best sleep mid-week"', now()),
('125ca6dd-715f-4c65-9d83-39ea06978884', 'recovery_preference', '"Prefers active recovery (walking, light yoga) over complete rest days"', now()),
('125ca6dd-715f-4c65-9d83-39ea06978884', 'stress_context', '"Work deadlines typically peak on Thursdays; correlates with elevated RHR"', now()),
('125ca6dd-715f-4c65-9d83-39ea06978884', 'nutrition_note', '"Intermittent fasting 16:8 schedule; first meal around noon"', now()),
('125ca6dd-715f-4c65-9d83-39ea06978884', 'injury_history', '"Left knee ACL reconstruction 2023; cleared for full activity but avoids plyometrics"', now())
ON CONFLICT (user_id, memory_key) DO UPDATE SET memory_value = EXCLUDED.memory_value, last_updated = now();