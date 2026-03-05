export type ServiceCategory =
  | 'doctor'
  | 'specialist'
  | 'physiotherapy'
  | 'dietitian'
  | 'psychologist'
  | 'chiropractor'
  | 'biokineticist'
  | 'personal-trainer'
  | 'massage-therapist'
  | 'occupational-therapist';

export type PlanType = 'best-fit' | 'high-impact' | 'progressive' | 'budget-conscious';

export type EvidenceLevel = 'high' | 'medium' | 'low';

export type ProficiencyLevel = 'expert' | 'experienced' | 'competent';

export interface TreatmentPlanService {
  type: ServiceCategory;
  price: number;
  sessions: number;
  description: string;
  frequency?: string;
  rationale?: string;
  evidenceLevel?: EvidenceLevel;
  recommendedPractitioners?: HealthcarePractitioner[];
}

export interface TreatmentPlan {
  id: string;
  name: string;
  description: string;
  services: TreatmentPlanService[];
  totalCost: number;
  planType: PlanType;
  timeFrame: string;
  complexityScore?: number;
  matchScore?: number;
  analyzedSymptoms?: string[];
  goal?: string;
  expectedOutcomes?: Array<{
    milestone: string;
    timeframe: string;
    description: string;
  }>;
  rationales?: Array<{
    service: string;
    rationale: string;
    evidenceLevel: EvidenceLevel;
  }>;
  progressTimeline?: Array<{
    week: number;
    milestone: string;
    focus: string;
  }>;
  alternativeOptions?: Array<{
    originalService: string;
    alternatives: string[];
    reason: string;
  }>;
}

export interface HealthcarePractitioner {
  id: string;
  fullName: string;
  title: string;
  specialty: string;
  location: string;
  city?: string;
  province?: string;
  onlineAvailable: boolean;
  rating: number;
  yearsExperience?: number;
  qualifications?: string[];
  languages?: string[];
  bio?: string;
  consultationFee?: number;
  acceptsMedicalAid: boolean;
  availableTimes?: Record<string, any>;
  contactEmail?: string;
  contactPhone?: string;
  profileImageUrl?: string;
  specialties?: ServiceCategory[];
  calendlyUrl?: string;
}

export interface UserTreatmentPreferences {
  preferredLocation?: string;
  maxBudgetMonthly?: number;
  preferOnline?: boolean;
  preferredGender?: 'male' | 'female' | 'no-preference';
  medicalAidProvider?: string;
  chronicConditions?: string[];
  allergies?: string[];
  currentMedications?: string[];
  preferredLanguages?: string[];
}

export interface HealthQuery {
  prompt: string;
  symptoms?: string[];
  budget?: number;
  location?: string;
  urgency?: 'routine' | 'soon' | 'urgent';
}

export interface TreatmentPlanGenerationParams {
  userInput: string;
  preferences?: UserTreatmentPreferences;
  userId?: string;
}
