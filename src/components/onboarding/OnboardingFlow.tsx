import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, ChevronRight, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { OnboardingWelcome } from "./OnboardingWelcome";
import { OnboardingProfile } from "./OnboardingProfile";
import { OnboardingWearable } from "./OnboardingWearable";
import { OnboardingBriefing } from "./OnboardingBriefing";

interface OnboardingFlowProps {
  onComplete: () => void;
  onSkip?: () => void;
}

const STEPS = [
  { id: 0, title: "Welcome", component: OnboardingWelcome },
  { id: 1, title: "Profile", component: OnboardingProfile },
  { id: 2, title: "Connect Device", component: OnboardingWearable },
  { id: 3, title: "Get Started", component: OnboardingBriefing },
];

export const OnboardingFlow = ({ onComplete, onSkip }: OnboardingFlowProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [userId, setUserId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadOnboardingProgress();
  }, []);

  const loadOnboardingProgress = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUserId(user.id);

      const { data } = await supabase
        .from("user_profiles")
        .select("onboarding_step")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data?.onboarding_step) {
        setCurrentStep(data.onboarding_step);
        const completed = new Set<number>();
        for (let i = 0; i < data.onboarding_step; i++) {
          completed.add(i);
        }
        setCompletedSteps(completed);
      }
    } catch (error) {
      console.error("Error loading onboarding progress:", error);
    }
  };

  const saveProgress = async (step: number) => {
    if (!userId) return;

    try {
      await supabase
        .from("user_profiles")
        .upsert({
          user_id: userId,
          onboarding_step: step,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "user_id",
        });
    } catch (error) {
      console.error("Error saving progress:", error);
    }
  };

  const handleNext = async () => {
    const newCompleted = new Set(completedSteps);
    newCompleted.add(currentStep);
    setCompletedSteps(newCompleted);

    if (currentStep < STEPS.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      await saveProgress(nextStep);
    } else {
      await completeOnboarding();
    }
  };

  const handleSkip = async () => {
    if (!userId) return;

    try {
      await supabase
        .from("user_profiles")
        .upsert({
          user_id: userId,
          onboarding_skipped: true,
          onboarding_step: currentStep,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "user_id",
        });

      toast({
        title: "Onboarding Skipped",
        description: "You can resume onboarding anytime from Settings",
      });

      onSkip?.();
    } catch (error) {
      console.error("Error skipping onboarding:", error);
      toast({
        title: "Error",
        description: "Failed to skip onboarding",
        variant: "destructive",
      });
    }
  };

  const completeOnboarding = async () => {
    if (!userId) return;

    try {
      await supabase
        .from("user_profiles")
        .upsert({
          user_id: userId,
          onboarding_completed: true,
          onboarding_step: STEPS.length,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "user_id",
        });

      toast({
        title: "Welcome to Predictiv!",
        description: "Your account is all set up",
      });

      onComplete();
    } catch (error) {
      console.error("Error completing onboarding:", error);
      toast({
        title: "Error",
        description: "Failed to complete onboarding",
        variant: "destructive",
      });
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const CurrentStepComponent = STEPS[currentStep].component;
  const progress = ((currentStep + 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl relative">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleSkip}
          className="absolute top-4 right-4 z-10"
        >
          <X className="h-4 w-4" />
        </Button>

        <CardContent className="pt-8 pb-8 px-6">
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">
                  Step {currentStep + 1} of {STEPS.length}
                </span>
                <span className="text-sm font-medium text-primary">
                  {Math.round(progress)}%
                </span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            <div className="flex items-center gap-4 justify-center mb-6">
              {STEPS.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${
                      completedSteps.has(index)
                        ? "bg-primary border-primary text-primary-foreground"
                        : index === currentStep
                        ? "border-primary text-primary"
                        : "border-muted text-muted-foreground"
                    }`}
                  >
                    {completedSteps.has(index) ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <span className="text-sm font-medium">{index + 1}</span>
                    )}
                  </div>
                  {index < STEPS.length - 1 && (
                    <ChevronRight className="h-5 w-5 text-muted-foreground mx-2" />
                  )}
                </div>
              ))}
            </div>

            <div className="min-h-[400px]">
              <CurrentStepComponent onNext={handleNext} onBack={handleBack} />
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <Button
                variant="ghost"
                onClick={handleSkip}
                className="text-muted-foreground"
              >
                Skip for now
              </Button>

              <div className="flex gap-2">
                {currentStep > 0 && (
                  <Button variant="outline" onClick={handleBack}>
                    Back
                  </Button>
                )}
                <Button onClick={handleNext}>
                  {currentStep === STEPS.length - 1 ? "Finish" : "Next"}
                  {currentStep < STEPS.length - 1 && (
                    <ChevronRight className="h-4 w-4 ml-1" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
