import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const Onboarding = () => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: "Welcome to Predictiv",
      description: "Your AI-powered training companion",
      content: "Track your fitness, prevent injuries, and optimize your performance with personalized insights."
    },
    {
      title: "Basic Information",
      description: "Tell us about yourself",
      content: "We'll use this information to create personalized training recommendations."
    },
    {
      title: "Injury History",
      description: "Help us understand your background",
      content: "Share any past injuries or conditions so we can tailor your training plan safely."
    },
    {
      title: "All Set!",
      description: "You're ready to start",
      content: "Your personalized dashboard is ready. Let's begin your journey to better performance."
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Navigate to dashboard on finish
      window.location.href = "/";
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full bg-glass backdrop-blur-xl border-glass-border p-8 md:p-12 text-center space-y-8 animate-fade-in">
        {/* Progress indicators */}
        <div className="flex justify-center gap-2 mb-8">
          {steps.map((_, index) => (
            <div
              key={index}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                index === currentStep
                  ? "w-12 bg-primary shadow-glow"
                  : index < currentStep
                  ? "w-8 bg-primary/60"
                  : "w-8 bg-muted"
              )}
            />
          ))}
        </div>

        {/* Content */}
        <div className="space-y-6">
          <div className="space-y-3">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">
              {currentStepData.title}
            </h1>
            <p className="text-lg text-primary font-medium">
              {currentStepData.description}
            </p>
          </div>
          
          <p className="text-muted-foreground text-base md:text-lg max-w-xl mx-auto">
            {currentStepData.content}
          </p>
        </div>

        {/* Navigation buttons */}
        <div className="flex gap-4 justify-center pt-6">
          {currentStep > 0 && (
            <Button
              variant="outline"
              onClick={handleBack}
              className="px-8 border-glass-border hover:bg-glass-highlight"
            >
              Back
            </Button>
          )}
          <Button
            onClick={handleNext}
            className="px-8 bg-primary hover:bg-primary/90 text-primary-foreground shadow-glow"
          >
            {isLastStep ? "Finish" : "Next"}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default Onboarding;
