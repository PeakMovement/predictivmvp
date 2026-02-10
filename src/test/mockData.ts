// Mock data for tests - uses loose types to allow testing various shapes

export const mockBriefing = {
  id: 'test-briefing-1',
  user_id: 'test-user-1',
  briefing_date: '2026-02-08',
  summary: 'Your sleep quality was excellent last night with 8 hours of restful sleep.',
  content: 'Your sleep quality was excellent last night with 8 hours of restful sleep. Your HRV is 15% above your baseline, indicating good recovery.',
  keyChanges: ['Sleep improved by 10%', 'HRV up 15%'],
  riskHighlights: [],
  key_metrics: {
    sleep_score: 85,
    hrv: 65,
    strain: 8.5,
    recovery_score: 82,
  },
  health_trends: {
    improving: ['sleep_quality', 'hrv'],
    declining: [],
    stable: ['activity_level'],
  },
  recommendations: [
    'Consider a moderate intensity workout today',
    'Stay hydrated throughout the day',
    'Aim for 7-8 hours of sleep tonight',
  ],
  alerts: [],
  created_at: '2026-02-08T06:00:00Z',
  updated_at: '2026-02-08T06:00:00Z',
};

export const mockBriefingWithAlerts = {
  ...mockBriefing,
  alerts: [
    {
      type: 'warning',
      message: 'Your HRV has dropped significantly. Consider taking an easy day.',
      severity: 'medium',
    },
    {
      type: 'info',
      message: 'Your sleep score is below your 7-day average.',
      severity: 'low',
    },
  ],
};

export const mockEmptyBriefing = {
  id: 'test-briefing-empty',
  user_id: 'test-user-1',
  briefing_date: '2026-02-08',
  summary: '',
  keyChanges: [],
  riskHighlights: [],
  content: null,
  key_metrics: null,
  health_trends: null,
  recommendations: [],
  alerts: [],
  created_at: '2026-02-08T06:00:00Z',
  updated_at: '2026-02-08T06:00:00Z',
};

export const mockTrendData = [
  {
    date: '2026-02-08',
    acwr: 1.2,
    strain: 8.5,
    sleep_score: 85,
    hrv: 65,
    training_load: 250,
    monotony: 1.5,
  },
  {
    date: '2026-02-07',
    acwr: 1.1,
    strain: 7.5,
    sleep_score: 80,
    hrv: 60,
    training_load: 240,
    monotony: 1.4,
  },
  {
    date: '2026-02-06',
    acwr: 1.3,
    strain: 8.5,
    sleep_score: 90,
    hrv: 70,
    training_load: 260,
    monotony: 1.6,
  },
];

export const mockWearableSession = {
  id: 'session-1',
  user_id: 'test-user-1',
  session_date: '2026-02-08',
  source: 'oura',
  activity_type: 'running',
  duration_minutes: 45,
  distance_meters: 7500,
  avg_heart_rate: 145,
  max_heart_rate: 168,
  calories_burned: 425,
  steps: 9500,
  active_calories: 325,
  created_at: '2026-02-08T07:00:00Z',
};

export const mockHealthProfile = {
  id: 'profile-1',
  user_id: 'test-user-1',
  profile_data: {
    age: 32,
    gender: 'male',
    conditions: ['asthma'],
    medications: ['albuterol'],
    fitness_level: 'intermediate',
  },
  ai_synthesis: 'Patient shows consistent improvement in cardiovascular fitness.',
  generated_at: '2026-02-08T00:00:00Z',
};

export const mockRiskScore = {
  score: 45,
  level: 'moderate' as const,
  factors: [
    { name: 'Sleep Quality', impact: 'positive', value: 85 },
    { name: 'HRV Variability', impact: 'negative', value: 15 },
    { name: 'Training Load', impact: 'neutral', value: 250 },
  ],
  recommendations: [
    'Focus on sleep consistency',
    'Monitor HRV trends',
    'Balance training intensity',
  ],
};

export const mockDocument = {
  id: 'doc-1',
  user_id: 'test-user-1',
  title: 'Blood Test Results',
  file_path: '/documents/blood-test-2026.pdf',
  file_type: 'pdf',
  document_type: 'medical',
  upload_date: '2026-02-01T00:00:00Z',
  file_size: 1024000,
  tags: ['bloodwork', 'annual-checkup'],
};

export const mockProvider = {
  id: 'provider-1',
  name: 'Dr. Jane Smith',
  specialty: 'Primary Care',
  location: 'San Francisco, CA',
  distance_miles: 2.5,
  rating: 4.8,
  accepting_new_patients: true,
  insurance_accepted: ['Blue Cross', 'Aetna', 'United Healthcare'],
  availability: 'Next available: Tomorrow',
};
