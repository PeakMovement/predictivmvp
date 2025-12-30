import { useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, Info, Stethoscope, UserRound, X, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";

type FlowStep = 
  | "initial_prompt"      // "We're detecting some potential issues. Would you like to check in?"
  | "declined_checkin"    // User said NO - show explanation + generic advice
  | "symptom_question"    // "Are you currently experiencing any symptoms?"
  | "symptom_form"        // Full symptom check-in form
  | "evaluation_result"   // After symptom evaluation - show results
  | "referral_question"   // "Would you like to be referred to a medical professional?"
  | "completed";          // Flow is done

interface AlertInfo {
  metric: string;
  value: number;
  threshold: number;
  message: string;
  type: "high_risk" | "anomaly" | "red_flag";
}

interface AlertCheckInFlowProps {
  alert: AlertInfo;
  onComplete: () => void;
  onNavigateToHelp?: () => void;
}

// Generate advice based on the alert type
function getGenericAdvice(alert: AlertInfo): { title: string; advice: string } {
  switch (alert.metric.toLowerCase()) {
    case "acwr":
      return {
        title: "Training Load Ratio Alert",
        advice: "Your training load ratio is higher than normal. This can sometimes increase injury risk. Consider reducing intensity tomorrow or adding more recovery activities like stretching or light walking."
      };
    case "strain":
      return {
        title: "Accumulated Strain Alert", 
        advice: "Your accumulated training strain is elevated. This means your body may need extra recovery. Consider taking a rest day or focusing on low-intensity activities."
      };
    case "monotony":
      return {
        title: "Training Monotony Alert",
        advice: "Your training variation is lower than recommended. Repeating similar workouts can increase injury risk. Try switching up your training tomorrow with different exercises or activities."
      };
    case "readiness":
      return {
        title: "Low Readiness Alert",
        advice: "Your readiness score indicates your body may not be fully recovered. Prioritize sleep, hydration, and consider lighter activities today."
      };
    case "sleep":
      return {
        title: "Sleep Quality Alert",
        advice: "Your sleep quality was below optimal. Poor sleep can affect recovery and performance. Consider improving your sleep environment and establishing a consistent bedtime routine."
      };
    default:
      return {
        title: `${alert.metric} Alert`,
        advice: alert.message || "Consider monitoring this metric and adjusting your activities accordingly."
      };
  }
}

export function AlertCheckInFlow({ alert, onComplete, onNavigateToHelp }: AlertCheckInFlowProps) {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<FlowStep>("initial_prompt");
  const [hasSymptoms, setHasSymptoms] = useState<boolean | null>(null);
  const [symptomSeverity, setSymptomSeverity] = useState<"none" | "mild" | "serious">("none");
  const symptomTextRef = useRef<string>("");
  const [symptomId, setSymptomId] = useState<string | null>(null);

  const handleYesCheckIn = useCallback(() => {
    setCurrentStep("symptom_question");
  }, []);

  const handleNoCheckIn = useCallback(() => {
    setCurrentStep("declined_checkin");
  }, []);

  const handleHasSymptoms = useCallback((answer: boolean) => {
    setHasSymptoms(answer);
    if (answer) {
      setCurrentStep("symptom_form");
    } else {
      // No symptoms - show AI guidance and end
      setSymptomSeverity("none");
      setCurrentStep("evaluation_result");
    }
  }, []);

  const handleSymptomFormSuccess = useCallback((checkinId: string, severity: "mild" | "serious", symptomText: string) => {
    setSymptomId(checkinId);
    setSymptomSeverity(severity);
    symptomTextRef.current = symptomText;
    
    if (severity === "serious") {
      // Serious symptoms - ask about referral
      setCurrentStep("referral_question");
    } else {
      // Mild symptoms - show AI guidance only
      setCurrentStep("evaluation_result");
    }
  }, []);

  const handleReferralYes = useCallback(() => {
    // Navigate to Help page with Medical Finder, passing the symptom text
      const params = new URLSearchParams({ q: symptomTextRef.current || '', severity: '7' });
      navigate(`/find-help?${params.toString()}`);
    onComplete();
  }, [navigate, onComplete]);

  const handleReferralNo = useCallback(() => {
    // Show AI guidance only
    setCurrentStep("evaluation_result");
  }, []);

  const handleClose = useCallback(() => {
    onComplete();
  }, [onComplete]);

  const genericAdvice = getGenericAdvice(alert);

  // STEP 1: Initial prompt - "We're detecting some potential issues. Would you like to check in?"
  if (currentStep === "initial_prompt") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
        <Card className="max-w-md w-full bg-card border-border/50 shadow-xl">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-foreground">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Health Check
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-foreground text-base">
              We're detecting some potential issues. Would you like to check in?
            </p>
            <div className="flex gap-3">
              <Button onClick={handleYesCheckIn} className="flex-1">
                Yes
              </Button>
              <Button onClick={handleNoCheckIn} variant="outline" className="flex-1">
                No
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // STEP 2a: User declined check-in - show explanation + generic advice
  if (currentStep === "declined_checkin") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
        <Card className="max-w-md w-full bg-card border-border/50 shadow-xl">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Info className="h-5 w-5 text-primary" />
                Ok, noted.
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={handleClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
              <h4 className="font-semibold text-foreground mb-2">{genericAdvice.title}</h4>
              <p className="text-sm text-muted-foreground">
                {genericAdvice.advice}
              </p>
            </div>
            <div className="text-xs text-muted-foreground">
              <span className="font-medium">Detected:</span> {alert.metric} at {alert.value} (threshold: {alert.threshold})
            </div>
            <Button onClick={handleClose} variant="outline" className="w-full">
              Got it
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // STEP 2b: Symptom question - "Are you currently experiencing any symptoms?"
  if (currentStep === "symptom_question") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
        <Card className="max-w-md w-full bg-card border-border/50 shadow-xl">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Stethoscope className="h-5 w-5 text-primary" />
              Symptom Check
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-foreground text-base">
              Are you currently experiencing any symptoms?
            </p>
            <div className="flex gap-3">
              <Button onClick={() => handleHasSymptoms(true)} className="flex-1">
                Yes
              </Button>
              <Button onClick={() => handleHasSymptoms(false)} variant="outline" className="flex-1">
                No
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // STEP 3: Symptom form (full check-in)
  if (currentStep === "symptom_form") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm overflow-y-auto">
        <div className="max-w-lg w-full my-8">
          <div className="flex justify-end mb-2">
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <SymptomCheckInFlowForm 
            onSuccess={handleSymptomFormSuccess}
            onCancel={handleClose}
          />
        </div>
      </div>
    );
  }

  // STEP 4: Referral question - "Would you like to be referred to a medical professional?"
  if (currentStep === "referral_question") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
        <Card className="max-w-md w-full bg-card border-border/50 shadow-xl">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-foreground">
              <UserRound className="h-5 w-5 text-orange-500" />
              Professional Help
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-foreground text-base">
              Based on your symptoms, we recommend speaking with a healthcare professional.
            </p>
            <p className="text-foreground font-medium">
              Would you like to be referred to a medical professional?
            </p>
            <div className="flex gap-3">
              <Button onClick={handleReferralYes} className="flex-1">
                Yes
              </Button>
              <Button onClick={handleReferralNo} variant="outline" className="flex-1">
                No
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // STEP 5: Evaluation result (AI guidance only - no serious symptoms or user declined referral)
  if (currentStep === "evaluation_result") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
        <Card className="max-w-md w-full bg-card border-border/50 shadow-xl">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-foreground">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                {hasSymptoms ? "Check-In Complete" : "All Clear"}
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={handleClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {!hasSymptoms ? (
              <p className="text-muted-foreground">
                Great! Since you're not experiencing any symptoms, here's some guidance based on your current metrics:
              </p>
            ) : (
              <p className="text-muted-foreground">
                Thank you for logging your symptoms. Based on your check-in, here's some guidance:
              </p>
            )}
            
            <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
              <h4 className="font-semibold text-foreground mb-2">{genericAdvice.title}</h4>
              <p className="text-sm text-muted-foreground">
                {genericAdvice.advice}
              </p>
            </div>

            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
              <p className="text-sm text-foreground">
                <strong>Tip:</strong> Monitor how you feel over the next 24-48 hours. If symptoms develop or worsen, use the "Find Help" feature to connect with a healthcare provider.
              </p>
            </div>

            <Button onClick={handleClose} className="w-full">
              Done
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}

// Simplified symptom form - single text prompt + severity slider
interface SymptomCheckInFlowFormProps {
  onSuccess: (checkinId: string, severity: "mild" | "serious", symptomText: string) => void;
  onCancel: () => void;
}

const formSchema = z.object({
  description: z.string().min(10, "Please describe your symptoms (at least 10 characters)"),
  severity: z.number().min(1).max(10),
});

// Red flag keywords that indicate serious conditions
const RED_FLAG_KEYWORDS = [
  "chest pain", "chest tightness", "heart", "cardiac",
  "can't breathe", "breathing difficulty", "shortness of breath", "difficulty breathing",
  "severe pain", "intense pain", "unbearable pain",
  "blood", "bleeding", "vomiting blood", "coughing blood",
  "faint", "fainting", "passed out", "unconscious",
  "stroke", "numbness", "paralysis", "can't move",
  "seizure", "convulsion",
  "suicidal", "self-harm"
];

const HIGH_SEVERITY_THRESHOLD = 7;

function SymptomCheckInFlowForm({ onSuccess, onCancel }: SymptomCheckInFlowFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: "",
      severity: 5,
    },
  });

  const severityValue = form.watch("severity");

  const getSeverityLabel = (value: number) => {
    if (value <= 3) return "Mild";
    if (value <= 6) return "Moderate";
    if (value <= 8) return "Severe";
    return "Critical";
  };

  const getSeverityColor = (value: number) => {
    if (value <= 3) return "text-green-400";
    if (value <= 6) return "text-yellow-400";
    if (value <= 8) return "text-orange-400";
    return "text-destructive";
  };

  const hasRedFlagKeywords = (text: string): boolean => {
    const lowerText = text.toLowerCase();
    return RED_FLAG_KEYWORDS.some(keyword => lowerText.includes(keyword));
  };

  const determineSymptomSeverity = (description: string, severity: number): "mild" | "serious" => {
    const hasRedFlags = hasRedFlagKeywords(description);
    const isHighSeverity = severity >= HIGH_SEVERITY_THRESHOLD;
    return (hasRedFlags || isHighSeverity) ? "serious" : "mild";
  };

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        throw new Error("You must be logged in to submit symptoms");
      }

      const { data: insertedData, error } = await supabase.from("symptom_check_ins").insert({
        user_id: session.user.id,
        symptom_type: "general",
        severity: getSeverityLabel(data.severity).toLowerCase(),
        description: data.description,
        onset_time: new Date().toISOString(),
      }).select('id').single();

      if (error) throw error;

      toast({
        title: "Symptom logged",
        description: "Your symptom has been recorded successfully.",
      });

      const severity = determineSymptomSeverity(data.description, data.severity);
      onSuccess(insertedData?.id || "", severity, data.description);
      
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to log symptom",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="bg-card/50 backdrop-blur-xl border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Stethoscope className="h-5 w-5 text-primary" />
          Describe Your Symptoms
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>What are you experiencing?</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe your symptoms in detail... For example: I've been having a headache for the past 2 days, especially in the morning. It's a dull pain behind my eyes."
                      className="bg-secondary/50 border-border/50 min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="severity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex justify-between">
                    <span>How severe is it?</span>
                    <span className={getSeverityColor(severityValue)}>
                      {severityValue} - {getSeverityLabel(severityValue)}
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Slider
                      min={1}
                      max={10}
                      step={1}
                      value={[field.value]}
                      onValueChange={(vals) => field.onChange(vals[0])}
                      className="py-4"
                    />
                  </FormControl>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Mild</span>
                    <span>Moderate</span>
                    <span>Severe</span>
                    <span>Critical</span>
                  </div>
                </FormItem>
              )}
            />

            <div className="flex gap-3">
              <Button type="submit" className="flex-1" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Submit"
                )}
              </Button>
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
