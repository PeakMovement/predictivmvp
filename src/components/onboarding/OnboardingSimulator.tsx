import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OnboardingStep } from "./OnboardingStep";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Heart, Activity, Watch, CheckCircle2 } from "lucide-react";

interface OnboardingSimulatorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

interface OnboardingData {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  height: string;
  heightUnit: "cm" | "ft";
  weight: string;
  weightUnit: "kg" | "lbs";
  device: string;
}

const TOTAL_STEPS = 5;

export function OnboardingSimulator({
  open,
  onOpenChange,
  onComplete,
}: OnboardingSimulatorProps) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>({
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    height: "",
    heightUnit: "cm",
    weight: "",
    weightUnit: "kg",
    device: "",
  });
  const { toast } = useToast();

  const handleNext = () => {
    if (step < TOTAL_STEPS - 1) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const handleComplete = () => {
    toast({
      title: "Simulation Complete",
      description: "This was a simulation. No data was saved to your profile.",
    });
    setStep(0);
    setData({
      firstName: "",
      lastName: "",
      dateOfBirth: "",
      height: "",
      heightUnit: "cm",
      weight: "",
      weightUnit: "kg",
      device: "",
    });
    onOpenChange(false);
    onComplete?.();
  };

  const handleClose = () => {
    setStep(0);
    onOpenChange(false);
  };

  const updateData = (field: keyof OnboardingData, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <OnboardingStep
            currentStep={step}
            totalSteps={TOTAL_STEPS}
            onNext={handleNext}
            nextLabel="Let's Get Started"
            showBack={false}
          >
            <div className="text-center space-y-6">
              <div className="w-20 h-20 mx-auto bg-gradient-to-br from-primary/20 to-primary/40 rounded-full flex items-center justify-center">
                <Sparkles className="h-10 w-10 text-primary" />
              </div>
              <div className="space-y-3">
                <h2 className="text-2xl font-bold text-foreground">
                  Welcome to Yves
                </h2>
                <p className="text-muted-foreground max-w-sm mx-auto">
                  Your personal wellness companion. We will ask you a few quick
                  questions to personalize your experience.
                </p>
              </div>
              <div className="flex justify-center gap-6 pt-4">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-rose-500/20 flex items-center justify-center">
                    <Heart className="h-6 w-6 text-rose-500" />
                  </div>
                  <span className="text-xs text-muted-foreground">Health</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <Activity className="h-6 w-6 text-blue-500" />
                  </div>
                  <span className="text-xs text-muted-foreground">Activity</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                    <Watch className="h-6 w-6 text-amber-500" />
                  </div>
                  <span className="text-xs text-muted-foreground">Wearables</span>
                </div>
              </div>
            </div>
          </OnboardingStep>
        );

      case 1:
        return (
          <OnboardingStep
            currentStep={step}
            totalSteps={TOTAL_STEPS}
            onNext={handleNext}
            onBack={handleBack}
            isNextDisabled={!data.firstName.trim()}
          >
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-xl font-semibold text-foreground">
                  What should we call you?
                </h2>
                <p className="text-sm text-muted-foreground">
                  Just a few quick details to personalize your experience
                </p>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    placeholder="Enter your first name"
                    value={data.firstName}
                    onChange={(e) => updateData("firstName", e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    placeholder="Enter your last name"
                    value={data.lastName}
                    onChange={(e) => updateData("lastName", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dob">Date of Birth (optional)</Label>
                  <Input
                    id="dob"
                    type="date"
                    value={data.dateOfBirth}
                    onChange={(e) => updateData("dateOfBirth", e.target.value)}
                  />
                </div>
              </div>
            </div>
          </OnboardingStep>
        );

      case 2:
        return (
          <OnboardingStep
            currentStep={step}
            totalSteps={TOTAL_STEPS}
            onNext={handleNext}
            onBack={handleBack}
          >
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-xl font-semibold text-foreground">
                  Physical Profile
                </h2>
                <p className="text-sm text-muted-foreground">
                  This helps Yves provide more accurate insights
                </p>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Height</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder={data.heightUnit === "cm" ? "175" : "5.9"}
                      value={data.height}
                      onChange={(e) => updateData("height", e.target.value)}
                      className="flex-1"
                    />
                    <Select
                      value={data.heightUnit}
                      onValueChange={(value: "cm" | "ft") =>
                        updateData("heightUnit", value)
                      }
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cm">cm</SelectItem>
                        <SelectItem value="ft">ft</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Weight</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder={data.weightUnit === "kg" ? "70" : "154"}
                      value={data.weight}
                      onChange={(e) => updateData("weight", e.target.value)}
                      className="flex-1"
                    />
                    <Select
                      value={data.weightUnit}
                      onValueChange={(value: "kg" | "lbs") =>
                        updateData("weightUnit", value)
                      }
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kg">kg</SelectItem>
                        <SelectItem value="lbs">lbs</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          </OnboardingStep>
        );

      case 3:
        return (
          <OnboardingStep
            currentStep={step}
            totalSteps={TOTAL_STEPS}
            onNext={handleNext}
            onBack={handleBack}
          >
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-xl font-semibold text-foreground">
                  Connect Your Device
                </h2>
                <p className="text-sm text-muted-foreground">
                  Which wearable do you use to track your health?
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: "oura", name: "Ōura Ring", icon: "💍" },
                  { id: "polar", name: "Polar", icon: "⌚" },
                  { id: "fitbit", name: "Fitbit", icon: "📱" },
                  { id: "apple", name: "Apple Watch", icon: "🍎", disabled: true },
                  { id: "other", name: "Other", icon: "📊" },
                  { id: "none", name: "None yet", icon: "🔜" },
                ].map((device) => (
                  <button
                    key={device.id}
                    onClick={() => updateData("device", device.id)}
                    disabled={device.disabled}
                    className={`p-4 rounded-xl border transition-all duration-200 ${
                      data.device === device.id
                        ? "bg-primary/20 border-primary"
                        : "bg-glass/30 border-glass-border hover:bg-glass-highlight"
                    } ${device.disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <div className="text-2xl mb-2">{device.icon}</div>
                    <div className="text-sm font-medium text-foreground">
                      {device.name}
                    </div>
                    {device.disabled && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Coming soon
                      </div>
                    )}
                  </button>
                ))}
              </div>
              <p className="text-xs text-center text-muted-foreground">
                You can connect or change your device later in Settings
              </p>
            </div>
          </OnboardingStep>
        );

      case 4:
        return (
          <OnboardingStep
            currentStep={step}
            totalSteps={TOTAL_STEPS}
            onNext={handleComplete}
            onBack={handleBack}
            nextLabel="Finish"
          >
            <div className="text-center space-y-6">
              <div className="w-20 h-20 mx-auto bg-gradient-to-br from-green-500/20 to-green-500/40 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10 text-green-500" />
              </div>
              <div className="space-y-3">
                <h2 className="text-2xl font-bold text-foreground">
                  You're All Set{data.firstName ? `, ${data.firstName}` : ""}!
                </h2>
                <p className="text-muted-foreground max-w-sm mx-auto">
                  Yves is ready to support you on your wellness journey. The more
                  you use the app, the more personalized your insights will become.
                </p>
              </div>
              <div className="bg-glass/50 border border-glass-border rounded-xl p-4 text-left">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Next step:</span>{" "}
                  Head to your Profile page to add more details about your health
                  goals, medical history, and preferences.
                </p>
              </div>
            </div>
          </OnboardingStep>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="sr-only">Onboarding Simulation</DialogTitle>
        </DialogHeader>
        {renderStep()}
      </DialogContent>
    </Dialog>
  );
}
