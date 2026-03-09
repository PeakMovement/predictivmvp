import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { useProviderMatch, ProviderMatch } from "@/hooks/useProviderMatch";
import { 
  AlertTriangle, 
  Loader2, 
  ArrowRight, 
  CheckCircle2, 
  DollarSign, 
  MapPin,
  Star,
  Phone
} from "lucide-react";

// Red-flag symptoms that trigger the funnel
const RED_FLAG_SYMPTOMS = ["chest_discomfort", "breathing_difficulty", "heart"];
const HIGH_SEVERITY_THRESHOLD = 7; // Severity 7+ triggers funnel

interface RedFlagFunnelProps {
  symptomType: string;
  severity: number;
  symptomId?: string;
  onComplete?: () => void;
  onSkip?: () => void;
}

function ProviderResultCard({ provider, isTop }: { provider: ProviderMatch; isTop?: boolean }) {
  return (
    <Card className={`${isTop ? 'border-primary/50 bg-primary/5' : 'bg-card/50'}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            {isTop && <Star className="h-4 w-4 text-primary fill-primary" />}
            <h3 className="font-semibold text-foreground">{provider.name}</h3>
          </div>
          <Badge variant={isTop ? "default" : "secondary"}>
            {provider.overallScore}% match
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mb-3">{provider.description}</p>
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">{provider.estimatedCost}</span>
          {provider.withinBudget ? (
            <span className="text-green-500 flex items-center gap-1 text-xs">
              <CheckCircle2 className="h-3 w-3" /> Within budget
            </span>
          ) : (
            <span className="text-yellow-500 flex items-center gap-1 text-xs">
              <AlertTriangle className="h-3 w-3" /> May exceed budget
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function RedFlagFunnel({ 
  symptomType, 
  severity, 
  symptomId,
  onComplete, 
  onSkip 
}: RedFlagFunnelProps) {
  const [step, setStep] = useState<"intro" | "budget" | "results">("intro");
  const [budgetMax, setBudgetMax] = useState([200]);
  const [location, setLocation] = useState("");
  
  const { findProvider, result, isLoading } = useProviderMatch();

  // Determine urgency based on symptom type and severity
  const isEmergency = RED_FLAG_SYMPTOMS.includes(symptomType) && severity >= 9;
  const isUrgent = RED_FLAG_SYMPTOMS.includes(symptomType) || severity >= HIGH_SEVERITY_THRESHOLD;
  const urgencyLevel = isEmergency ? "emergency" : isUrgent ? "urgent" : "soon";

  const handleFindProviders = useCallback(async () => {
    await findProvider({
      symptom_type: symptomType,
      budget_max: budgetMax[0],
      location: location || "any",
      urgency: urgencyLevel
    });
    setStep("results");
  }, [symptomType, budgetMax, location, urgencyLevel, findProvider]);

  // Emergency case - show 911 immediately
  if (isEmergency) {
    return (
      <Card className="bg-destructive/10 border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Emergency Detected
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-foreground">
            Your symptoms indicate a potential emergency. Please seek immediate medical attention.
          </p>
          <div className="flex gap-3">
            <Button className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground" asChild>
              <a href="tel:911">
                <Phone className="h-4 w-4 mr-2" />
                Call 911 Now
              </a>
            </Button>
            <Button variant="outline" onClick={onSkip}>
              I'm Okay
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Step 1: Intro - explain why we're asking and offer direct redirect to Help page
  if (step === "intro") {
    return (
      <Card className="bg-orange-500/10 border-orange-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Important: Help Finding
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Based on your symptom severity, we recommend connecting you with a healthcare provider.
          </p>
          <div className="flex gap-3">
            <Button onClick={onComplete} className="flex-1">
              Find a medical professional
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            <Button variant="outline" onClick={onSkip}>
              Skip
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Step 2: Budget & Location
  if (step === "budget") {
    return (
      <Card className="bg-card/50 backdrop-blur-xl border-border/50">
        <CardHeader>
          <CardTitle className="text-foreground">Quick Questions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Budget */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                Maximum budget per visit
              </Label>
              <span className="text-sm font-medium text-primary">${budgetMax[0]}</span>
            </div>
            <Slider
              value={budgetMax}
              onValueChange={setBudgetMax}
              min={50}
              max={500}
              step={25}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>$50</span>
              <span>$500</span>
            </div>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              Your location (optional)
            </Label>
            <Input
              placeholder="City or ZIP code"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <Button 
            onClick={handleFindProviders} 
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Finding Matches...
              </>
            ) : (
              <>
                Find Best Match
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Step 3: Results
  if (step === "results" && result?.topMatch) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Recommended Providers</h3>
          <Button variant="ghost" size="sm" onClick={() => setStep("budget")}>
            Adjust Search
          </Button>
        </div>

        <ProviderResultCard provider={result.topMatch} isTop />

        {result.alternatives.length > 0 && (
          <>
            <p className="text-sm text-muted-foreground">Other Options</p>
            {result.alternatives.map((alt, idx) => (
              <ProviderResultCard key={idx} provider={alt} />
            ))}
          </>
        )}

        <Button onClick={onComplete} variant="outline" className="w-full">
          Done
        </Button>
      </div>
    );
  }

  return null;
}

// Helper to check if a symptom should trigger the red-flag funnel
export function shouldTriggerRedFlagFunnel(symptomType: string, severity: number): boolean {
  const isRedFlagSymptom = RED_FLAG_SYMPTOMS.includes(symptomType);
  const isHighSeverity = severity >= HIGH_SEVERITY_THRESHOLD;
  const shouldTrigger = isRedFlagSymptom || isHighSeverity;
  
  if (shouldTrigger) {
    const reason = isRedFlagSymptom 
      ? `Red-flag symptom detected: ${symptomType}` 
      : `High severity threshold exceeded: ${severity}/10`;
  }
  
  return shouldTrigger;
}
