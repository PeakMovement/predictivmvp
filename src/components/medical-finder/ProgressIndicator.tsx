import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RotateCcw, Check } from 'lucide-react';
import { MedicalFinderStep } from '@/contexts/MedicalFinderContext';

interface ProgressIndicatorProps {
  currentStep: MedicalFinderStep;
  onBack?: () => void;
  onStartOver?: () => void;
}

const steps: { key: MedicalFinderStep; label: string }[] = [
  { key: 'intake', label: 'Symptoms' },
  { key: 'severity', label: 'Assessment' },
  { key: 'results', label: 'Providers' },
  { key: 'treatment', label: 'Plan' },
];

export function ProgressIndicator({ currentStep, onBack, onStartOver }: ProgressIndicatorProps) {
  // Map analyzing/matching to their display step
  const displayStep = currentStep === 'analyzing' ? 'intake' : 
                     currentStep === 'matching' ? 'severity' : 
                     currentStep;
  
  const currentIndex = steps.findIndex(s => s.key === displayStep);

  const getStepStatus = (stepIndex: number) => {
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'current';
    return 'upcoming';
  };

  return (
    <div className="flex items-center justify-between gap-4">
      {/* Back Button */}
      <div className="w-24">
        {onBack && (
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        )}
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-2 flex-1 justify-center">
        {steps.map((step, index) => {
          const status = getStepStatus(index);
          return (
            <React.Fragment key={step.key}>
              <div className="flex flex-col items-center gap-1">
                <div 
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                    status === 'completed' 
                      ? 'bg-primary text-primary-foreground' 
                      : status === 'current'
                        ? 'bg-primary/20 text-primary border-2 border-primary'
                        : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {status === 'completed' ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                <span className={`text-xs hidden sm:block ${
                  status === 'current' ? 'text-foreground font-medium' : 'text-muted-foreground'
                }`}>
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div 
                  className={`h-0.5 w-8 sm:w-12 ${
                    index < currentIndex ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Start Over Button */}
      <div className="w-24 flex justify-end">
        {onStartOver && (
          <Button variant="ghost" size="sm" onClick={onStartOver} className="gap-1">
            <RotateCcw className="h-4 w-4" />
            <span className="hidden sm:inline">Reset</span>
          </Button>
        )}
      </div>
    </div>
  );
}
