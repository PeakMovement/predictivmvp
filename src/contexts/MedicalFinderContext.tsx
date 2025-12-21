import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type MedicalFinderStep = 'intake' | 'analyzing' | 'severity' | 'matching' | 'results' | 'treatment';

export interface ExtractedSymptom {
  symptom: string;
  bodyArea?: string;
  duration?: string;
}

export interface SeverityAssessment {
  level: 'mild' | 'moderate' | 'severe' | 'critical';
  score: number;
  confidence: number;
}

export interface UrgencyAssessment {
  level: 'routine' | 'soon' | 'urgent' | 'emergency';
  reasoning: string;
}

export interface SymptomAnalysis {
  extractedSymptoms: ExtractedSymptom[];
  severity: SeverityAssessment;
  urgency: UrgencyAssessment;
  isEmergency: boolean;
  emergencyFlags: string[];
  suggestedSpecialties: string[];
  followUpQuestions?: string[];
}

export interface PhysicianMatch {
  id: string;
  name: string;
  specialty: string;
  subSpecialty?: string;
  location: string;
  city: string;
  state: string;
  rating: number;
  costTier: string;
  availability: string;
  insuranceAccepted: string[];
  telehealthAvailable: boolean;
  yearsExperience: number;
  matchScore: number;
  matchReasons: string[];
}

export interface TreatmentPlan {
  summary: string;
  immediateSteps: string[];
  beforeAppointment: string[];
  questionsForDoctor: string[];
  lifestyleRecommendations: string[];
  warningSignsToWatch: string[];
  estimatedRecovery?: string;
}

export interface UserPreferences {
  location?: string;
  insurance?: string;
  costPreference?: 'low' | 'medium' | 'high' | 'any';
  telehealth?: boolean;
}

interface MedicalFinderState {
  currentStep: MedicalFinderStep;
  symptoms: string;
  analysis: SymptomAnalysis | null;
  physicianMatches: PhysicianMatch[];
  selectedPhysician: PhysicianMatch | null;
  treatmentPlan: TreatmentPlan | null;
  preferences: UserPreferences;
  isLoading: boolean;
  error: string | null;
  showEmergencyAlert: boolean;
}

interface MedicalFinderContextType extends MedicalFinderState {
  setSymptoms: (symptoms: string) => void;
  setAnalysis: (analysis: SymptomAnalysis) => void;
  setPhysicianMatches: (matches: PhysicianMatch[]) => void;
  selectPhysician: (physician: PhysicianMatch) => void;
  setTreatmentPlan: (plan: TreatmentPlan) => void;
  setPreferences: (preferences: UserPreferences) => void;
  setCurrentStep: (step: MedicalFinderStep) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setShowEmergencyAlert: (show: boolean) => void;
  reset: () => void;
  goBack: () => void;
}

const initialState: MedicalFinderState = {
  currentStep: 'intake',
  symptoms: '',
  analysis: null,
  physicianMatches: [],
  selectedPhysician: null,
  treatmentPlan: null,
  preferences: {},
  isLoading: false,
  error: null,
  showEmergencyAlert: false,
};

const MedicalFinderContext = createContext<MedicalFinderContextType | undefined>(undefined);

export function MedicalFinderProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<MedicalFinderState>(initialState);

  const setSymptoms = useCallback((symptoms: string) => {
    setState(prev => ({ ...prev, symptoms }));
  }, []);

  const setAnalysis = useCallback((analysis: SymptomAnalysis) => {
    setState(prev => ({ 
      ...prev, 
      analysis,
      showEmergencyAlert: analysis.isEmergency 
    }));
  }, []);

  const setPhysicianMatches = useCallback((matches: PhysicianMatch[]) => {
    setState(prev => ({ ...prev, physicianMatches: matches }));
  }, []);

  const selectPhysician = useCallback((physician: PhysicianMatch) => {
    setState(prev => ({ ...prev, selectedPhysician: physician }));
  }, []);

  const setTreatmentPlan = useCallback((plan: TreatmentPlan) => {
    setState(prev => ({ ...prev, treatmentPlan: plan }));
  }, []);

  const setPreferences = useCallback((preferences: UserPreferences) => {
    setState(prev => ({ ...prev, preferences }));
  }, []);

  const setCurrentStep = useCallback((step: MedicalFinderStep) => {
    setState(prev => ({ ...prev, currentStep: step }));
  }, []);

  const setIsLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, isLoading: loading }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error }));
  }, []);

  const setShowEmergencyAlert = useCallback((show: boolean) => {
    setState(prev => ({ ...prev, showEmergencyAlert: show }));
  }, []);

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  const goBack = useCallback(() => {
    const stepOrder: MedicalFinderStep[] = ['intake', 'analyzing', 'severity', 'matching', 'results', 'treatment'];
    const currentIndex = stepOrder.indexOf(state.currentStep);
    if (currentIndex > 0) {
      // Skip 'analyzing' and 'matching' when going back
      let newIndex = currentIndex - 1;
      while (newIndex > 0 && (stepOrder[newIndex] === 'analyzing' || stepOrder[newIndex] === 'matching')) {
        newIndex--;
      }
      setState(prev => ({ ...prev, currentStep: stepOrder[newIndex] }));
    }
  }, [state.currentStep]);

  const value: MedicalFinderContextType = {
    ...state,
    setSymptoms,
    setAnalysis,
    setPhysicianMatches,
    selectPhysician,
    setTreatmentPlan,
    setPreferences,
    setCurrentStep,
    setIsLoading,
    setError,
    setShowEmergencyAlert,
    reset,
    goBack,
  };

  return (
    <MedicalFinderContext.Provider value={value}>
      {children}
    </MedicalFinderContext.Provider>
  );
}

export function useMedicalFinderContext() {
  const context = useContext(MedicalFinderContext);
  if (!context) {
    throw new Error('useMedicalFinderContext must be used within a MedicalFinderProvider');
  }
  return context;
}
