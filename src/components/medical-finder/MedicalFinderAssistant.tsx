import React from 'react';
import { MedicalFinderProvider } from '@/contexts/MedicalFinderContext';
import { useMedicalFinder } from '@/hooks/useMedicalFinder';
import { SymptomIntakeStep } from './SymptomIntakeStep';
import { SeverityAssessmentStep } from './SeverityAssessmentStep';
import { ProviderResultsStep } from './ProviderResultsStep';
import { TreatmentPlanStep } from './TreatmentPlanStep';
import { EmergencyAlert } from './EmergencyAlert';
import { AnalyzingStep } from './AnalyzingStep';
import { ProgressIndicator } from './ProgressIndicator';

function MedicalFinderContent() {
  const { 
    currentStep, 
    showEmergencyAlert, 
    isLoading,
    dismissEmergency,
    startOver,
    goBack
  } = useMedicalFinder();

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

interface MedicalFinderAssistantProps {
  initialSymptoms?: string;
}

export function MedicalFinderAssistant({ initialSymptoms = '' }: MedicalFinderAssistantProps) {
  return (
    <MedicalFinderProvider initialSymptoms={initialSymptoms}>
      <MedicalFinderContent />
    </MedicalFinderProvider>
  );
}
