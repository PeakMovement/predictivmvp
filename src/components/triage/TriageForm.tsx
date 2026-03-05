import { useState } from "react";
import { useTriagePrediction, TriageInput } from "@/hooks/useTriagePrediction";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, UserSearch, AlertTriangle, CheckCircle, Clock, Zap } from "lucide-react";

const issueTypes = [
  { value: "pain", label: "Pain or Discomfort" },
  { value: "fatigue", label: "Fatigue or Low Energy" },
  { value: "sleep", label: "Sleep Problems" },
  { value: "breathing", label: "Breathing Issues" },
  { value: "heart", label: "Heart or Chest Concerns" },
  { value: "digestive", label: "Digestive Issues" },
  { value: "mental_health", label: "Mental Health Concerns" },
  { value: "injury", label: "Injury or Recovery" },
  { value: "performance", label: "Performance Decline" },
  { value: "other", label: "Other Health Concern" },
];

const severityOptions = [
  { value: "mild", label: "Mild - Minor concern" },
  { value: "moderate", label: "Moderate - Noticeable impact" },
  { value: "severe", label: "Severe - Significant impact" },
  { value: "critical", label: "Critical - Urgent concern" },
];

export const TriageForm = () => {
  const [issueType, setIssueType] = useState("");
  const [severity, setSeverity] = useState("");
  const [notes, setNotes] = useState("");
  const { predictProvider, prediction, isLoading, error } = useTriagePrediction();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueType) return;

    const input: TriageInput = {
      issue_type: issueType,
      severity: severity || undefined,
      contextual_factors: notes ? { user_notes: notes } : undefined,
    };

    await predictProvider(input);
  };

  const getUrgencyConfig = (urgency: string) => {
    switch (urgency) {
      case "emergency":
        return { icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/20", label: "Emergency" };
      case "urgent":
        return { icon: Zap, color: "text-orange-400", bg: "bg-orange-400/20", label: "Urgent" };
      case "soon":
        return { icon: Clock, color: "text-yellow-400", bg: "bg-yellow-400/20", label: "See Soon" };
      default:
        return { icon: CheckCircle, color: "text-green-400", bg: "bg-green-400/20", label: "Routine" };
    }
  };

  return (
    <div className="space-y-6">
      {/* Input Form */}
      <Card className="bg-card/50 backdrop-blur-xl border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <UserSearch className="h-5 w-5 text-primary" />
            Find the Right Care
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                What's concerning you? *
              </label>
              <Select value={issueType} onValueChange={setIssueType}>
                <SelectTrigger className="bg-secondary/50 border-border/50">
                  <SelectValue placeholder="Select your main concern" />
                </SelectTrigger>
                <SelectContent>
                  {issueTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                How severe is it?
              </label>
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger className="bg-secondary/50 border-border/50">
                  <SelectValue placeholder="Select severity level" />
                </SelectTrigger>
                <SelectContent>
                  {severityOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Additional details (optional)
              </label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Describe your symptoms, when they started, what makes them better or worse..."
                className="bg-secondary/50 border-border/50 min-h-[80px]"
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading || !issueType}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                "Get Recommendation"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="bg-destructive/10 border-destructive/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <p>{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Display */}
      {prediction && (
        <Card className="bg-card/50 backdrop-blur-xl border-border/50">
          <CardHeader>
            <CardTitle className="text-foreground">Recommendation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Urgency Badge */}
            {prediction.urgency && (
              <div className="flex items-center gap-2">
                {(() => {
                  const config = getUrgencyConfig(prediction.urgency);
                  const Icon = config.icon;
                  return (
                    <Badge className={`${config.bg} ${config.color} border-0`}>
                      <Icon className="h-3 w-3 mr-1" />
                      {config.label}
                    </Badge>
                  );
                })()}
              </div>
            )}

            {/* Provider Recommendation */}
            {prediction.recommended_provider && (
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
                <h3 className="font-semibold text-lg text-foreground mb-1">
                  {typeof prediction.recommended_provider === "string" 
                    ? prediction.recommended_provider 
                    : prediction.recommended_provider.name}
                </h3>
                {prediction.confidence_score && (
                  <p className="text-sm text-muted-foreground">
                    Confidence: {Math.round(prediction.confidence_score)}%
                  </p>
                )}
              </div>
            )}

            {/* Reasoning */}
            {prediction.reasoning && (
              <div>
                <h4 className="font-medium text-foreground mb-2">Why this recommendation?</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {prediction.reasoning}
                </p>
              </div>
            )}

            {/* Action Items */}
            {prediction.action_items && prediction.action_items.length > 0 && (
              <div>
                <h4 className="font-medium text-foreground mb-2">Next Steps</h4>
                <ul className="space-y-1">
                  {prediction.action_items.map((item: string, i: number) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Data Sources Used */}
            {prediction.data_sources_used && prediction.data_sources_used.length > 0 && (
              <div className="pt-4 border-t border-border/30">
                <p className="text-xs text-muted-foreground">
                  Based on: {prediction.data_sources_used.join(", ")}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
