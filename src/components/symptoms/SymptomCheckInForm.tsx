import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Loader2, Stethoscope, AlertTriangle, UserSearch } from "lucide-react";

// Red flag keywords that indicate potential serious conditions
const RED_FLAG_KEYWORDS = [
  "chest pain",
  "difficulty breathing",
  "shortness of breath",
  "can't breathe",
  "severe pain",
  "blood",
  "bleeding",
  "faint",
  "fainting",
  "passed out",
  "unconscious",
  "stroke",
  "numbness",
  "paralysis",
  "seizure",
  "suicidal",
  "self-harm",
  "heart",
  "palpitations",
  "vision loss",
  "sudden weakness",
  "slurred speech",
  "confusion",
  "worst headache",
  "head injury",
  "overdose",
];

const formSchema = z.object({
  description: z
    .string()
    .min(10, "Please describe your symptoms in at least 10 characters")
    .max(2000, "Description is too long"),
  severity: z.number().min(1).max(10),
  additionalNotes: z.string().max(1000).optional(),
});

type FormData = z.infer<typeof formSchema>;

interface SymptomCheckInFormProps {
  onSuccess?: (checkinId: string) => void;
}

export function SymptomCheckInForm({ onSuccess }: SymptomCheckInFormProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showProfessionalPrompt, setShowProfessionalPrompt] = useState(false);
  const [submittedData, setSubmittedData] = useState<FormData | null>(null);
  const [lastCheckinId, setLastCheckinId] = useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: "",
      severity: 5,
      additionalNotes: "",
    },
  });

  // Check if description contains any red flag keywords
  const checkRedFlagKeywords = (text: string): boolean => {
    const lowerText = text.toLowerCase();
    return RED_FLAG_KEYWORDS.some((keyword) => lowerText.includes(keyword));
  };

  // Map numeric severity to string
  const getSeverityString = (value: number): string => {
    if (value <= 3) return "mild";
    if (value <= 5) return "moderate";
    if (value <= 7) return "severe";
    return "critical";
  };

  // Get severity label for display
  const getSeverityLabel = (value: number): string => {
    if (value <= 2) return "Mild";
    if (value <= 4) return "Moderate";
    if (value <= 6) return "Uncomfortable";
    if (value <= 8) return "Severe";
    return "Critical";
  };

  // Get severity color class
  const getSeverityColor = (value: number): string => {
    if (value <= 2) return "text-emerald-500";
    if (value <= 4) return "text-yellow-500";
    if (value <= 6) return "text-orange-500";
    if (value <= 8) return "text-red-500";
    return "text-red-600";
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast({
          title: "Not logged in",
          description: "Please log in to log symptoms.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // Combine description with additional notes for storage
      const fullDescription = data.additionalNotes
        ? `${data.description}\n\nAdditional notes: ${data.additionalNotes}`
        : data.description;

      // Insert into symptom_check_ins table
      const { data: checkin, error } = await supabase
        .from("symptom_check_ins")
        .insert({
          user_id: user.id,
          symptom_type: "general",
          severity: getSeverityString(data.severity),
          description: fullDescription,
          body_location: null,
          triggers: null,
        })
        .select("id")
        .single();

      if (error) throw error;

      toast({
        title: "Symptom logged",
        description: "Your symptom has been recorded successfully.",
      });

      const checkinId = checkin?.id;
      setLastCheckinId(checkinId || null);

      // Check for red flags
      const hasRedFlags = checkRedFlagKeywords(data.description);
      const isHighSeverity = data.severity >= 7;

      if (hasRedFlags || isHighSeverity) {
        // Store data and show professional prompt
        setSubmittedData(data);
        setShowProfessionalPrompt(true);
      } else {
        // No red flags - just call success callback
        if (onSuccess && checkinId) {
          onSuccess(checkinId);
        }
      }

      form.reset();
    } catch (error) {
      console.error("Error logging symptom:", error);
      toast({
        title: "Error",
        description: "Failed to log symptom. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFindProfessional = () => {
    if (!submittedData) return;

    // Build query string with symptom data
    const symptomText = submittedData.additionalNotes
      ? `${submittedData.description} | Notes: ${submittedData.additionalNotes}`
      : submittedData.description;

    const params = new URLSearchParams({
      q: symptomText,
      severity: submittedData.severity.toString(),
    });

    setShowProfessionalPrompt(false);
    navigate(`/find-help?${params.toString()}`);
  };

  const handleDeclineProfessional = () => {
    setShowProfessionalPrompt(false);
    // Call success callback after declining
    if (onSuccess && lastCheckinId) {
      onSuccess(lastCheckinId);
    }
    setSubmittedData(null);
    setLastCheckinId(null);
  };

  return (
    <>
      <Card className="bg-card/50 backdrop-blur-xl border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Stethoscope className="h-5 w-5 text-primary" />
            Log a Symptom
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Symptom Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">
                      What are you experiencing?
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe your symptoms in detail... (e.g., I've had a headache behind my eyes for the past 2 hours)"
                        className="min-h-[120px] bg-background/50 border-border/50 text-foreground placeholder:text-muted-foreground resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Severity Slider */}
              <FormField
                control={form.control}
                name="severity"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel className="text-foreground">Severity</FormLabel>
                      <span
                        className={`text-sm font-medium ${getSeverityColor(
                          field.value
                        )}`}
                      >
                        {field.value}/10 - {getSeverityLabel(field.value)}
                      </span>
                    </div>
                    <FormControl>
                      <div className="pt-2">
                        <Slider
                          min={1}
                          max={10}
                          step={1}
                          value={[field.value]}
                          onValueChange={(vals) => field.onChange(vals[0])}
                          className="w-full"
                        />
                        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                          <span>Mild</span>
                          <span>Moderate</span>
                          <span>Severe</span>
                          <span>Critical</span>
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Additional Notes */}
              <FormField
                control={form.control}
                name="additionalNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">
                      Additional Notes{" "}
                      <span className="text-muted-foreground font-normal">
                        (optional)
                      </span>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Any other details, context, or recent changes..."
                        className="min-h-[80px] bg-background/50 border-border/50 text-foreground placeholder:text-muted-foreground resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Logging...
                  </>
                ) : (
                  "Log Symptom"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Professional Help Prompt Dialog */}
      <Dialog open={showProfessionalPrompt} onOpenChange={setShowProfessionalPrompt}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              We recommend seeking professional help
            </DialogTitle>
            <DialogDescription className="pt-2">
              Based on your symptoms, we suggest speaking with a healthcare
              professional. Would you like us to help you find one?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={handleDeclineProfessional}
              className="w-full sm:w-auto"
            >
              No thanks
            </Button>
            <Button
              onClick={handleFindProfessional}
              className="w-full sm:w-auto"
            >
              <UserSearch className="mr-2 h-4 w-4" />
              Yes, find help
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Keep the old export for backwards compatibility
export const SymptomCheckInFormLegacy = SymptomCheckInForm;
