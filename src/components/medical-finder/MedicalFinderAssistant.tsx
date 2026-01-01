import React, { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MedicalFinderProvider } from '@/contexts/MedicalFinderContext';
import { useMedicalFinder } from '@/hooks/useMedicalFinder';
import { SymptomIntakeStep } from './SymptomIntakeStep';
import { SeverityAssessmentStep } from './SeverityAssessmentStep';
import { ProviderResultsStep } from './ProviderResultsStep';
import { TreatmentPlanStep } from './TreatmentPlanStep';
import { EmergencyAlert } from './EmergencyAlert';
import { AnalyzingStep } from './AnalyzingStep';
import { ProgressIndicator } from './ProgressIndicator';
import { Loader2 } from 'lucide-react';

interface MedicalFinderAssistantProps {
  initialSymptomsOverride?: string;
}

function MedicalFinderContent() {
  const { 
    currentStep, 
    showEmergencyAlert, 
    isLoading,
    isRestoringSession,
    dismissEmergency,
    startOver,
    goBack
  } = useMedicalFinder();

  // Show loading state while restoring session
  if (isRestoringSession) {
    return (
      <div className="w-full max-w-4xl mx-auto flex flex-col items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Restoring your session...</p>
      </div>
    );
  }

  const renderStep = () => {
    switch (currentStep) {
      case 'intake':
        return <SymptomIntakeStep />;
      case 'analyzing':
      case 'matching':
        return <AnalyzingStep />;
      case 'severity':
        return <SeverityAssessmentStep />;
      case 'results':
        return <ProviderResultsStep />;
      case 'treatment':
        return <TreatmentPlanStep />;
      default:
        return <SymptomIntakeStep />;
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Progress Indicator */}
      <ProgressIndicator 
        currentStep={currentStep} 
        onBack={currentStep !== 'intake' && !isLoading ? goBack : undefined}
        onStartOver={currentStep !== 'intake' ? startOver : undefined}
      />

      {/* Emergency Alert Overlay */}
      {showEmergencyAlert && (
        <EmergencyAlert onDismiss={dismissEmergency} />
      )}

      {/* Main Content */}
      <div className="mt-6">
        {renderStep()}
      </div>
    </div>
  );
}

export function MedicalFinderAssistant({ initialSymptomsOverride }: MedicalFinderAssistantProps) {
  const [searchParams] = useSearchParams();

  // Read query parameters OR sessionStorage and build initial symptoms string
  const initialSymptoms = useMemo(() => {
    // Priority 1: Direct prop override (from FindHelp when using internal finder)
    if (initialSymptomsOverride) {
      console.log('[MedicalFinderAssistant] Using prop override:', initialSymptomsOverride);
      return initialSymptomsOverride;
    }

    // Priority 2: Check sessionStorage (from symptom check-in flow)
    const storedQuery = sessionStorage.getItem('findHelpQuery');
    if (storedQuery) {
      try {
        const { q, severity } = JSON.parse(storedQuery);
        console.log('[MedicalFinderAssistant] Using sessionStorage data:', { q, severity });
        if (q) {
          return q;
        }
      } catch (e) {
        console.error('[MedicalFinderAssistant] Failed to parse stored query:', e);
      }
    }
    
    // Priority 3: Fall back to URL search params
    const q = searchParams.get('q');
    const severity = searchParams.get('severity');
    
    if (q) {
      return severity ? `${q} (Severity: ${severity})` : q;
    }
    return '';
  }, [initialSymptomsOverride, searchParams]);

  return (
    <MedicalFinderProvider initialSymptoms={initialSymptoms}>
      <MedicalFinderContent />
    </MedicalFinderProvider>
  );
}
