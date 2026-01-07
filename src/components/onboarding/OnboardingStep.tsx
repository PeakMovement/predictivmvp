import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

interface OnboardingStepProps {
  children: ReactNode;
  currentStep: number;
  totalSteps: number;
  onNext?: () => void;
  onBack?: () => void;
  nextLabel?: string;
  showBack?: boolean;
  isNextDisabled?: boolean;
}

export function OnboardingStep({
  children,
  currentStep,
  totalSteps,
  onNext,
  onBack,
  nextLabel = "Continue",
  showBack = true,
  isNextDisabled = false,
}: OnboardingStepProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Progress indicator */}
      <div className="flex justify-center gap-2 mb-6">
        {Array.from({ length: totalSteps }).map((_, index) => (
          <div
            key={index}
            className={cn(
              "h-2 rounded-full transition-all duration-300",
              index === currentStep
                ? "w-8 bg-primary"
                : index < currentStep
                ? "w-2 bg-primary/60"
                : "w-2 bg-muted"
            )}
          />
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 py-4">{children}</div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t border-border/50">
        {showBack && currentStep > 0 ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        ) : (
          <div />
        )}
        {onNext && (
          <Button onClick={onNext} disabled={isNextDisabled}>
            {nextLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
