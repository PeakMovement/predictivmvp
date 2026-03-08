-- Add active_profile and health_context columns to alert_settings
ALTER TABLE alert_settings ADD COLUMN IF NOT EXISTS active_profile TEXT;
ALTER TABLE alert_settings ADD COLUMN IF NOT EXISTS health_context TEXT;

-- Widen ACWR constraint: preset profiles use values as low as 1.2, AI range starts at 1.1
ALTER TABLE alert_settings DROP CONSTRAINT IF EXISTS alert_settings_acwr_critical_threshold_check;
ALTER TABLE alert_settings ADD CONSTRAINT alert_settings_acwr_critical_threshold_check
  CHECK (acwr_critical_threshold >= 1.1 AND acwr_critical_threshold <= 2.5);

-- Widen strain constraint: Elite preset uses 2500, AI range goes to 3000
ALTER TABLE alert_settings DROP CONSTRAINT IF EXISTS alert_settings_strain_critical_threshold_check;
ALTER TABLE alert_settings ADD CONSTRAINT alert_settings_strain_critical_threshold_check
  CHECK (strain_critical_threshold >= 800 AND strain_critical_threshold <= 3000);
