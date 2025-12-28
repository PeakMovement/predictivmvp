import React, { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useMedicalSession, MedicalSessionData } from '@/hooks/useMedicalSession';

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
  phone?: string;
  email?: string;
  rating: number;
  costTier: string;
  availability: string;
  availabilitySchedule?: Array<{ day: string; start: string; end: string }>;
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
  maxBudget?: number;
}

interface MedicalFinderState {
  currentStep: MedicalFinderStep;
  symptoms: string;
  initialSymptoms: string;
  analysis: SymptomAnalysis | null;
  physicianMatches: PhysicianMatch[];
  selectedPhysician: PhysicianMatch | null;
  treatmentPlan: TreatmentPlan | null;
  preferences: UserPreferences;
  isLoading: boolean;
  error: string | null;
  showEmergencyAlert: boolean;
  sessionId: string | null;
  isRestoringSession: boolean;
}

interface MedicalFinderContextType extends MedicalFinderState {
  setSymptoms: (symptoms: string) => void;
  setInitialSymptoms: (symptoms: string) => void;
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
  completeSession: (bookingId?: string) => Promise<void>;
  startNewSearch: () => Promise<void>;
}

const initialState: MedicalFinderState = {
  currentStep: 'intake',
  symptoms: '',
  initialSymptoms: '',
  analysis: null,
  physicianMatches: [],
  selectedPhysician: null,
  treatmentPlan: null,
  preferences: {},
  isLoading: false,
  error: null,
  showEmergencyAlert: false,
  sessionId: null,
  isRestoringSession: false,
};

const MedicalFinderContext = createContext<MedicalFinderContextType | undefined>(undefined);

interface MedicalFinderProviderProps {
  children: ReactNode;
  initialSymptoms?: string;
}

// Map context step to backend step name
function stepToBackendStep(step: MedicalFinderStep): string {
  const mapping: Record<MedicalFinderStep, string> = {
    'intake': 'symptoms',
    'analyzing': 'symptoms',
    'severity': 'preferences',
    'matching': 'provider_results',
    'results': 'provider_results',
    'treatment': 'treatment_plan'
  };
  return mapping[step];
}

// Map backend step to context step
function backendStepToStep(backendStep: string): MedicalFinderStep {
  const mapping: Record<string, MedicalFinderStep> = {
    'symptoms': 'intake',
    'preferences': 'severity',
    'provider_results': 'results',
    'treatment_plan': 'treatment',
    'booking': 'treatment'
  };
  return mapping[backendStep] || 'intake';
}

export function MedicalFinderProvider({ children, initialSymptoms = '' }: MedicalFinderProviderProps) {
  const [state, setState] = useState<MedicalFinderState>({
    ...initialState,
    initialSymptoms,
    symptoms: initialSymptoms,
    isRestoringSession: true, // Start true, will be set false after restore attempt
  });

  const { saveSession, getSession, completeSession: completeSessionApi, abandonSession } = useMedicalSession();
  const hasRestoredSession = useRef(false);
  const isAuthenticated = useRef(false);

  // Restore session on mount
  useEffect(() => {
    if (hasRestoredSession.current) return;
    
    const restoreSession = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        isAuthenticated.current = !!user;
        
        if (!user) {
          console.log('[Session] No user, skipping restore');
          setState(prev => ({ ...prev, isRestoringSession: false }));
          return;
        }

        const { exists, session } = await getSession();
        
        if (exists && session) {
          console.log('[Session] Restoring session:', session.currentStep);
          const data = session.data;
          
          setState(prev => ({
            ...prev,
            sessionId: session.id,
            currentStep: backendStepToStep(session.currentStep),
            symptoms: data.symptoms?.primary || '',
            preferences: {
              location: data.preferences?.location?.city,
              insurance: data.preferences?.insurance?.[0],
              telehealth: data.preferences?.telehealthPreferred,
            },
          analysis: (data.analysis as unknown as SymptomAnalysis) || null,
          physicianMatches: (data.physicianMatches as unknown as PhysicianMatch[]) || [],
          selectedPhysician: data.selectedPhysician ? {
            id: data.selectedPhysician.id,
            name: data.selectedPhysician.name,
            specialty: data.selectedPhysician.specialty,
          } as PhysicianMatch : null,
          treatmentPlan: (data.treatmentPlan as unknown as TreatmentPlan) || null,
            isRestoringSession: false,
          }));
        } else {
          setState(prev => ({ ...prev, isRestoringSession: false }));
        }
      } catch (err) {
        console.error('[Session] Restore error:', err);
        setState(prev => ({ ...prev, isRestoringSession: false }));
      }
      
      hasRestoredSession.current = true;
    };

    restoreSession();
  }, [getSession]);

  // Persist session on state changes (debounced via step changes)
  const persistSession = useCallback(async (newState: MedicalFinderState) => {
    if (!isAuthenticated.current) return;
    if (newState.isRestoringSession) return;
    if (newState.currentStep === 'analyzing' || newState.currentStep === 'matching') return;

    const sessionData: MedicalSessionData = {
      symptoms: {
        primary: newState.symptoms,
        secondary: newState.analysis?.extractedSymptoms?.map(s => s.symptom) || [],
      },
      preferences: {
        location: newState.preferences.location ? { city: newState.preferences.location } : undefined,
        insurance: newState.preferences.insurance ? [newState.preferences.insurance] : undefined,
        telehealthPreferred: newState.preferences.telehealth,
      },
      selectedPhysician: newState.selectedPhysician ? {
        id: newState.selectedPhysician.id,
        name: newState.selectedPhysician.name,
        specialty: newState.selectedPhysician.specialty,
      } : undefined,
      analysis: (newState.analysis as unknown as Record<string, unknown>) || undefined,
      physicianMatches: (newState.physicianMatches as unknown as Record<string, unknown>[]) || undefined,
      treatmentPlan: (newState.treatmentPlan as unknown as Record<string, unknown>) || undefined,
    };

    const { success, sessionId } = await saveSession(
      stepToBackendStep(newState.currentStep),
      sessionData
    );

    if (success && sessionId && !newState.sessionId) {
      setState(prev => ({ ...prev, sessionId }));
    }
  }, [saveSession]);

  const setSymptoms = useCallback((symptoms: string) => {
    setState(prev => ({ ...prev, symptoms }));
  }, []);

  const setInitialSymptoms = useCallback((initialSymptoms: string) => {
    setState(prev => ({ ...prev, initialSymptoms, symptoms: initialSymptoms }));
  }, []);

  const setAnalysis = useCallback((analysis: SymptomAnalysis) => {
    setState(prev => {
      const newState = { 
        ...prev, 
        analysis,
        showEmergencyAlert: analysis.isEmergency 
      };
      return newState;
    });
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
    setState(prev => {
      const newState = { ...prev, currentStep: step };
      // Persist on step change (not during loading states)
      if (step !== 'analyzing' && step !== 'matching') {
        persistSession(newState);
      }
      return newState;
    });
  }, [persistSession]);

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
      let newIndex = currentIndex - 1;
      while (newIndex > 0 && (stepOrder[newIndex] === 'analyzing' || stepOrder[newIndex] === 'matching')) {
        newIndex--;
      }
      const newStep = stepOrder[newIndex];
      setState(prev => {
        const newState = { ...prev, currentStep: newStep };
        persistSession(newState);
        return newState;
      });
    }
  }, [state.currentStep, persistSession]);

  const completeSession = useCallback(async (bookingId?: string) => {
    await completeSessionApi(bookingId);
    setState(prev => ({ ...prev, sessionId: null }));
  }, [completeSessionApi]);

  const startNewSearch = useCallback(async () => {
    // Abandon current session if exists
    if (state.sessionId) {
      await abandonSession();
    }
    // Reset state
    setState({
      ...initialState,
      isRestoringSession: false,
    });
  }, [state.sessionId, abandonSession]);

  const value: MedicalFinderContextType = {
    ...state,
    setSymptoms,
    setInitialSymptoms,
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
    completeSession,
    startNewSearch,
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
