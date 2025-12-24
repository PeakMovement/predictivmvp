import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  useMedicalFinderContext, 
  SymptomAnalysis, 
  PhysicianMatch, 
  TreatmentPlan,
  UserPreferences 
} from '@/contexts/MedicalFinderContext';

export function useMedicalFinder() {
  const context = useMedicalFinderContext();

  const analyzeSymptoms = useCallback(async (symptoms: string) => {
    context.setSymptoms(symptoms);
    context.setCurrentStep('analyzing');
    context.setIsLoading(true);
    context.setError(null);

    try {
      const { data, error } = await supabase.functions.invoke('symptom-analysis', {
        body: { symptoms }
      });

      if (error) throw error;

      const analysis = data as SymptomAnalysis;
      context.setAnalysis(analysis);
      
      if (analysis.isEmergency) {
        context.setShowEmergencyAlert(true);
      }
      
      context.setCurrentStep('severity');
      return analysis;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to analyze symptoms';
      context.setError(message);
      toast.error('Analysis failed', { description: message });
      context.setCurrentStep('intake');
      return null;
    } finally {
      context.setIsLoading(false);
    }
  }, [context]);

  const findPhysicians = useCallback(async (preferences?: UserPreferences) => {
    if (!context.analysis) {
      toast.error('Please describe your symptoms first');
      return null;
    }

    context.setCurrentStep('matching');
    context.setIsLoading(true);
    context.setError(null);

    if (preferences) {
      context.setPreferences(preferences);
    }

    try {
      const { data, error } = await supabase.functions.invoke('physician-match-advanced', {
        body: {
          suggestedSpecialties: context.analysis.suggestedSpecialties,
          urgency: context.analysis.urgency.level,
          preferences: preferences || context.preferences,
          limit: 5
        }
      });

      if (error) throw error;

      const matches = (data?.matches || []) as PhysicianMatch[];
      context.setPhysicianMatches(matches);
      context.setCurrentStep('results');
      
      if (matches.length === 0) {
        toast.info('No exact matches found', { 
          description: 'Try adjusting your preferences for more results' 
        });
      }
      
      return matches;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to find physicians';
      context.setError(message);
      toast.error('Search failed', { description: message });
      context.setCurrentStep('severity');
      return null;
    } finally {
      context.setIsLoading(false);
    }
  }, [context]);

  const generateTreatmentPlan = useCallback(async (physician: PhysicianMatch) => {
    if (!context.analysis) {
      toast.error('Missing symptom analysis');
      return null;
    }

    context.selectPhysician(physician);
    context.setIsLoading(true);
    context.setError(null);

    try {
      const { data, error } = await supabase.functions.invoke('generate-treatment-plan', {
        body: {
          symptoms: context.symptoms,
          severity: context.analysis.severity,
          selectedPhysician: {
            name: physician.name,
            specialty: physician.specialty,
            location: physician.location
          },
          extractedSymptoms: context.analysis.extractedSymptoms
        }
      });

      if (error) throw error;

      const plan = data as TreatmentPlan;
      context.setTreatmentPlan(plan);
      context.setCurrentStep('treatment');
      
      return plan;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate treatment plan';
      context.setError(message);
      toast.error('Plan generation failed', { description: message });
      return null;
    } finally {
      context.setIsLoading(false);
    }
  }, [context]);

  const dismissEmergency = useCallback(() => {
    context.setShowEmergencyAlert(false);
  }, [context]);

  const startOver = useCallback(async () => {
    await context.startNewSearch();
  }, [context]);

  const completeSessionWithBooking = useCallback(async (bookingId?: string) => {
    await context.completeSession(bookingId);
  }, [context]);

  return {
    // State
    ...context,
    
    // Actions
    analyzeSymptoms,
    findPhysicians,
    generateTreatmentPlan,
    dismissEmergency,
    startOver,
    completeSessionWithBooking,
  };
}
