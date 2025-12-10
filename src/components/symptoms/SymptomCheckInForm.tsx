import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Loader2, Stethoscope } from "lucide-react";

const symptomTypes = [
  { value: "headache", label: "Headache" },
  { value: "fatigue", label: "Fatigue" },
  { value: "muscle_pain", label: "Muscle Pain" },
  { value: "joint_pain", label: "Joint Pain" },
  { value: "chest_discomfort", label: "Chest Discomfort" },
  { value: "breathing_difficulty", label: "Breathing Difficulty" },
  { value: "sleep_issues", label: "Sleep Issues" },
  { value: "digestive_issues", label: "Digestive Issues" },
  { value: "dizziness", label: "Dizziness" },
  { value: "other", label: "Other" },
];

const bodyLocations = [
  { value: "head", label: "Head" },
  { value: "neck", label: "Neck" },
  { value: "chest", label: "Chest" },
  { value: "back", label: "Back" },
  { value: "abdomen", label: "Abdomen" },
  { value: "arms", label: "Arms" },
  { value: "legs", label: "Legs" },
  { value: "joints", label: "Joints" },
  { value: "full_body", label: "Full Body" },
  { value: "other", label: "Other" },
];

const triggerOptions = [
  { value: "exercise", label: "Exercise" },
  { value: "stress", label: "Stress" },
  { value: "food", label: "Food" },
  { value: "sleep", label: "Poor Sleep" },
  { value: "medication", label: "Medication" },
  { value: "weather", label: "Weather" },
  { value: "other", label: "Other" },
];

const formSchema = z.object({
  symptom_type: z.string().min(1, "Please select a symptom type"),
  severity: z.number().min(1).max(10),
  description: z.string().optional(),
  body_location: z.string().optional(),
  triggers: z.array(z.string()).optional(),
  duration_hours: z.number().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface SymptomCheckInFormProps {
  onSuccess?: () => void;
}

export const SymptomCheckInForm = ({ onSuccess }: SymptomCheckInFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTriggers, setSelectedTriggers] = useState<string[]>([]);
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      symptom_type: "",
      severity: 5,
      description: "",
      body_location: "",
      triggers: [],
      duration_hours: undefined,
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

  const toggleTrigger = (trigger: string) => {
    const updated = selectedTriggers.includes(trigger)
      ? selectedTriggers.filter((t) => t !== trigger)
      : [...selectedTriggers, trigger];
    setSelectedTriggers(updated);
    form.setValue("triggers", updated);
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        throw new Error("You must be logged in to submit symptoms");
      }

      const { error } = await supabase.from("symptom_check_ins").insert({
        user_id: session.user.id,
        symptom_type: data.symptom_type,
        severity: getSeverityLabel(data.severity).toLowerCase(),
        description: data.description || null,
        body_location: data.body_location || null,
        triggers: data.triggers && data.triggers.length > 0 ? data.triggers : null,
        duration_hours: data.duration_hours || null,
        onset_time: new Date().toISOString(),
      });

      if (error) throw error;

      toast({
        title: "Symptom logged",
        description: "Your symptom has been recorded successfully.",
      });

      form.reset();
      setSelectedTriggers([]);
      onSuccess?.();
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
          Log a Symptom
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="symptom_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Symptom Type *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-secondary/50 border-border/50">
                        <SelectValue placeholder="Select symptom type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {symptomTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                    <span>Severity</span>
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

            <FormField
              control={form.control}
              name="body_location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Body Location</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-secondary/50 border-border/50">
                        <SelectValue placeholder="Where is the symptom?" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {bodyLocations.map((loc) => (
                        <SelectItem key={loc.value} value={loc.value}>
                          {loc.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="triggers"
              render={() => (
                <FormItem>
                  <FormLabel>Possible Triggers</FormLabel>
                  <div className="flex flex-wrap gap-2">
                    {triggerOptions.map((trigger) => (
                      <Button
                        key={trigger.value}
                        type="button"
                        variant={selectedTriggers.includes(trigger.value) ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleTrigger(trigger.value)}
                        className="text-xs"
                      >
                        {trigger.label}
                      </Button>
                    ))}
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe how you're feeling..."
                      className="bg-secondary/50 border-border/50 min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Log Symptom"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
