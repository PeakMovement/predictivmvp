import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useMedicalFinder } from '@/hooks/useMedicalFinder';
import { useMedicalFinderContext } from '@/contexts/MedicalFinderContext';
import { 
  AlertCircle, 
  AlertTriangle, 
  ArrowRight, 
  Activity,
  DollarSign,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Video
} from 'lucide-react';

export function SeverityAssessmentStep() {
  const { findPhysicians, isLoading, analysis } = useMedicalFinder();
  const { preferences, setPreferences } = useMedicalFinderContext();
  
  const [severityValue, setSeverityValue] = useState<number[]>([analysis?.severity?.score || 5]);
  const [additionalSymptoms, setAdditionalSymptoms] = useState('');
  const [maxBudget, setMaxBudget] = useState<string>('');
  const [showPreferences, setShowPreferences] = useState(false);

  const getSeverityLabel = (value: number) => {
    if (value <= 2) return { label: 'Minimal', color: 'text-green-500', bg: 'bg-green-500/10' };
    if (value <= 4) return { label: 'Mild', color: 'text-emerald-500', bg: 'bg-emerald-500/10' };
    if (value <= 6) return { label: 'Moderate', color: 'text-yellow-500', bg: 'bg-yellow-500/10' };
    if (value <= 8) return { label: 'Severe', color: 'text-orange-500', bg: 'bg-orange-500/10' };
    return { label: 'Critical', color: 'text-destructive', bg: 'bg-destructive/10' };
  };

  const severity = getSeverityLabel(severityValue[0]);

  const handleFindProviders = async () => {
    // Update preferences with budget if provided
    const updatedPreferences = {
      ...preferences,
      maxBudget: maxBudget ? parseFloat(maxBudget) : undefined,
      additionalSymptoms: additionalSymptoms || undefined,
      severityScore: severityValue[0],
    };
    
    setPreferences(updatedPreferences as any);
    await findPhysicians(updatedPreferences);
  };

  if (!analysis) {
    return (
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardContent className="py-12 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No analysis available. Please go back and describe your symptoms.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Analysis Summary Card */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl">Symptom Analysis</CardTitle>
              <CardDescription className="mt-1">
                Based on what you've described
              </CardDescription>
            </div>
            <Badge 
              variant="outline" 
              className={`${severity.bg} ${severity.color} border-current`}
            >
              {analysis.urgency.level.toUpperCase()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Detected Symptoms */}
          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">Detected Symptoms</Label>
            <div className="flex flex-wrap gap-2">
              {analysis.extractedSymptoms.map((symptom, i) => (
                <Badge key={i} variant="secondary" className="font-normal">
                  {symptom.symptom}
                  {symptom.bodyArea && <span className="text-muted-foreground ml-1">({symptom.bodyArea})</span>}
                </Badge>
              ))}
            </div>
          </div>

          {/* Suggested Specialists */}
          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">Recommended Specialists</Label>
            <div className="flex flex-wrap gap-2">
              {analysis.suggestedSpecialties.map((specialty, i) => (
                <Badge key={i} variant="outline" className="bg-primary/5 border-primary/20">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  {specialty}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Severity Slider Card */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className={`h-5 w-5 ${severity.color}`} />
            How would you rate your symptoms?
          </CardTitle>
          <CardDescription>
            Slide to indicate the severity of your symptoms (1-10)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{severityValue[0]}</span>
              <Badge className={`${severity.bg} ${severity.color} border-0`}>
                {severity.label}
              </Badge>
            </div>
            
            <Slider
              value={severityValue}
              onValueChange={setSeverityValue}
              min={1}
              max={10}
              step={1}
              className="py-4"
            />
            
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Minimal discomfort</span>
              <span>Severe/Unbearable</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Additional Details */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Additional Details</CardTitle>
          <CardDescription>
            Any other symptoms or information that might help us find the right provider
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Optional: Describe any other symptoms, when they started, triggers, or relevant medical history..."
            value={additionalSymptoms}
            onChange={(e) => setAdditionalSymptoms(e.target.value)}
            className="min-h-[100px] bg-background/50"
          />
        </CardContent>
      </Card>

      {/* Optional Filters Toggle */}
      <Button
        type="button"
        variant="ghost"
        className="w-full justify-between"
        onClick={() => setShowPreferences(!showPreferences)}
      >
        <span className="flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          Budget & Preferences (Optional)
        </span>
        {showPreferences ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </Button>

      {showPreferences && (
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="pt-6 space-y-4">
            {/* Budget Input */}
            <div className="space-y-2">
              <Label htmlFor="budget" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                Maximum Budget per Visit
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="budget"
                  type="number"
                  placeholder="e.g., 200"
                  value={maxBudget}
                  onChange={(e) => setMaxBudget(e.target.value)}
                  className="pl-8 bg-background/50"
                />
              </div>
              <p className="text-xs text-muted-foreground">Leave empty to see all providers</p>
            </div>

            {/* Insurance Input */}
            <div className="space-y-2">
              <Label htmlFor="insurance">Insurance Provider (Optional)</Label>
              <Input
                id="insurance"
                placeholder="e.g., Blue Cross, Aetna"
                value={preferences.insurance || ''}
                onChange={(e) => setPreferences({ ...preferences, insurance: e.target.value })}
                className="bg-background/50"
              />
            </div>

            {/* Telehealth Preference */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <Label htmlFor="telehealth" className="cursor-pointer flex items-center gap-2">
                <Video className="h-4 w-4 text-primary" />
                Telehealth preferred
              </Label>
              <Switch
                id="telehealth"
                checked={preferences.telehealth || false}
                onCheckedChange={(checked) => setPreferences({ ...preferences, telehealth: checked })}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Find Providers Button */}
      <Button
        onClick={handleFindProviders}
        size="lg"
        className="w-full h-14 text-lg font-medium"
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Activity className="h-5 w-5 mr-2 animate-pulse" />
            Finding Providers...
          </>
        ) : (
          <>
            Find Healthcare Professionals
            <ArrowRight className="h-5 w-5 ml-2" />
          </>
        )}
      </Button>
    </div>
  );
}
