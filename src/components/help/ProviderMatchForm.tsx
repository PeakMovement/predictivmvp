import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useProviderMatch, ProviderMatch } from "@/hooks/useProviderMatch";
import { Search, Loader2, DollarSign, MapPin, AlertCircle, CheckCircle2, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const SYMPTOM_OPTIONS = [
  { value: "headache", label: "Headache / Migraine" },
  { value: "chest_pain", label: "Chest Pain" },
  { value: "fatigue", label: "Fatigue / Low Energy" },
  { value: "muscle_pain", label: "Muscle Pain" },
  { value: "joint_pain", label: "Joint Pain" },
  { value: "sleep_issues", label: "Sleep Problems" },
  { value: "anxiety", label: "Anxiety" },
  { value: "depression", label: "Depression / Mood" },
  { value: "digestive", label: "Digestive Issues" },
  { value: "respiratory", label: "Breathing / Respiratory" },
  { value: "injury", label: "Sports Injury" },
  { value: "heart", label: "Heart Concerns" },
  { value: "nutrition", label: "Diet / Nutrition" },
  { value: "stress", label: "Stress Management" },
  { value: "other", label: "Other" }
];

const URGENCY_OPTIONS = [
  { value: "routine", label: "Routine (can wait)" },
  { value: "soon", label: "Soon (within a week)" },
  { value: "urgent", label: "Urgent (within 24-48h)" },
  { value: "emergency", label: "Emergency (now)" }
];

function ProviderCard({ provider, isTop }: { provider: ProviderMatch; isTop?: boolean }) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <Card className={`${isTop ? 'border-primary/50 bg-primary/5' : 'bg-card/50'}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              {isTop && <Star className="h-4 w-4 text-primary fill-primary" />}
              <h3 className="font-semibold text-foreground">{provider.name}</h3>
            </div>
            <p className="text-sm text-muted-foreground">{provider.specialty}</p>
          </div>
          <Badge variant={isTop ? "default" : "secondary"} className="text-sm">
            {provider.overallScore}% match
          </Badge>
        </div>

        <p className="text-sm text-muted-foreground mb-3">{provider.description}</p>

        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="flex items-center gap-1">
            <DollarSign className="h-3 w-3 text-muted-foreground" />
            <span className={getScoreColor(provider.budgetScore)}>
              {provider.budgetScore}%
            </span>
          </div>
          <div className="flex items-center gap-1">
            <MapPin className="h-3 w-3 text-muted-foreground" />
            <span className={getScoreColor(provider.locationScore)}>
              {provider.locationScore}%
            </span>
          </div>
          <div className="flex items-center gap-1">
            <AlertCircle className="h-3 w-3 text-muted-foreground" />
            <span className={getScoreColor(provider.urgencyScore)}>
              {provider.urgencyScore}%
            </span>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between">
          <span className="text-sm font-medium">{provider.estimatedCost}</span>
          {provider.withinBudget ? (
            <span className="text-xs text-green-500 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Within budget
            </span>
          ) : (
            <span className="text-xs text-yellow-500 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> May exceed budget
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function ProviderMatchForm() {
  const [symptomType, setSymptomType] = useState("");
  const [budgetMax, setBudgetMax] = useState([250]);
  const [location, setLocation] = useState("");
  const [urgency, setUrgency] = useState("routine");
  
  const { findProvider, result, isLoading, error, reset } = useProviderMatch();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symptomType) return;

    await findProvider({
      symptom_type: symptomType,
      budget_max: budgetMax[0],
      location: location || "any",
      urgency
    });
  };

  const handleReset = () => {
    reset();
    setSymptomType("");
    setBudgetMax([250]);
    setLocation("");
    setUrgency("routine");
  };

  return (
    <div className="space-y-4">
      {/* Search Form */}
      <Card className="bg-card/50 backdrop-blur-xl border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            Find the Right Provider
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Symptom Type */}
            <div className="space-y-2">
              <Label htmlFor="symptom">What's your concern?</Label>
              <Select value={symptomType} onValueChange={setSymptomType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your primary concern" />
                </SelectTrigger>
                <SelectContent>
                  {SYMPTOM_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Budget */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Budget (max per visit)</Label>
                <span className="text-sm font-medium text-primary">${budgetMax[0]}</span>
              </div>
              <Slider
                value={budgetMax}
                onValueChange={setBudgetMax}
                min={50}
                max={500}
                step={25}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>$50</span>
                <span>$500</span>
              </div>
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="location">Location (optional)</Label>
              <Input
                id="location"
                placeholder="City or ZIP code"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>

            {/* Urgency */}
            <div className="space-y-2">
              <Label>How soon do you need care?</Label>
              <Select value={urgency} onValueChange={setUrgency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {URGENCY_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Submit */}
            <Button 
              type="submit" 
              className="w-full" 
              disabled={!symptomType || isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Finding Match...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Find Provider
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <Card className="bg-destructive/10 border-destructive/30">
          <CardContent className="p-4">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {result?.topMatch && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Best Match</h3>
            <Button variant="ghost" size="sm" onClick={handleReset}>
              New Search
            </Button>
          </div>
          
          <ProviderCard provider={result.topMatch} isTop />

          {result.alternatives.length > 0 && (
            <>
              <h4 className="text-sm font-medium text-muted-foreground mt-4">
                Alternative Options
              </h4>
              {result.alternatives.map((alt, idx) => (
                <ProviderCard key={idx} provider={alt} />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
