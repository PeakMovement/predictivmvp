import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useMedicalFinder } from '@/hooks/useMedicalFinder';
import { AlertTriangle, CheckCircle, AlertCircle, Activity, ArrowRight, Settings2 } from 'lucide-react';
import { UserPreferences } from '@/contexts/MedicalFinderContext';

export function SeverityAssessmentStep() {
  const { analysis, findPhysicians, isLoading } = useMedicalFinder();
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState<UserPreferences>({
    location: '',
    insurance: '',
    costPreference: 'any',
    telehealth: false,
  });

  if (!analysis) return null;

  const getSeverityColor = (level: string) => {
    switch (level) {
      case 'mild': return 'text-green-500';
      case 'moderate': return 'text-yellow-500';
      case 'severe': return 'text-orange-500';
      case 'critical': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  const getSeverityIcon = (level: string) => {
    switch (level) {
      case 'mild': return <CheckCircle className="h-6 w-6 text-green-500" />;
      case 'moderate': return <AlertCircle className="h-6 w-6 text-yellow-500" />;
      case 'severe': return <AlertTriangle className="h-6 w-6 text-orange-500" />;
      case 'critical': return <AlertTriangle className="h-6 w-6 text-destructive animate-pulse" />;
      default: return <Activity className="h-6 w-6" />;
    }
  };

  const getUrgencyBadge = (level: string) => {
    const styles: Record<string, string> = {
      routine: 'bg-green-500/10 text-green-500 border-green-500/30',
      soon: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30',
      urgent: 'bg-orange-500/10 text-orange-500 border-orange-500/30',
      emergency: 'bg-destructive/10 text-destructive border-destructive/30 animate-pulse',
    };
    return styles[level] || styles.routine;
  };

  const handleFindPhysicians = async () => {
    await findPhysicians(preferences);
  };

  return (
    <div className="space-y-6">
      {/* Severity Card */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getSeverityIcon(analysis.severity.level)}
              <div>
                <CardTitle className="text-xl">Severity Assessment</CardTitle>
                <CardDescription>Based on your symptom description</CardDescription>
              </div>
            </div>
            <div className={`px-3 py-1 rounded-full border text-sm font-medium capitalize ${getUrgencyBadge(analysis.urgency.level)}`}>
              {analysis.urgency.level}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Severity Score */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Severity Level</span>
              <span className={`font-semibold capitalize ${getSeverityColor(analysis.severity.level)}`}>
                {analysis.severity.level} ({analysis.severity.score}/10)
              </span>
            </div>
            <div className="h-3 bg-muted/50 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${
                  analysis.severity.score <= 3 ? 'bg-green-500' :
                  analysis.severity.score <= 5 ? 'bg-yellow-500' :
                  analysis.severity.score <= 7 ? 'bg-orange-500' :
                  'bg-destructive'
                }`}
                style={{ width: `${analysis.severity.score * 10}%` }}
              />
            </div>
          </div>

          {/* Urgency Reasoning */}
          <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
            <p className="text-sm">{analysis.urgency.reasoning}</p>
          </div>

          {/* Extracted Symptoms */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Identified Symptoms</h4>
            <div className="flex flex-wrap gap-2">
              {analysis.extractedSymptoms.map((symptom, index) => (
                <div 
                  key={index}
                  className="px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-sm"
                >
                  {symptom.symptom}
                  {symptom.bodyArea && <span className="text-muted-foreground ml-1">({symptom.bodyArea})</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Suggested Specialties */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Recommended Specialists</h4>
            <div className="flex flex-wrap gap-2">
              {analysis.suggestedSpecialties.map((specialty, index) => (
                <div 
                  key={index}
                  className="px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground text-sm"
                >
                  {specialty}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preferences Section */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <button
            onClick={() => setShowPreferences(!showPreferences)}
            className="flex items-center justify-between w-full text-left"
          >
            <div className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">Search Preferences</CardTitle>
            </div>
            <span className="text-sm text-muted-foreground">
              {showPreferences ? 'Hide' : 'Show'}
            </span>
          </button>
        </CardHeader>
        {showPreferences && (
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="location">Location / City</Label>
                <Input
                  id="location"
                  placeholder="e.g., San Francisco"
                  value={preferences.location}
                  onChange={(e) => setPreferences(prev => ({ ...prev, location: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="insurance">Insurance Provider</Label>
                <Input
                  id="insurance"
                  placeholder="e.g., Blue Cross"
                  value={preferences.insurance}
                  onChange={(e) => setPreferences(prev => ({ ...prev, insurance: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cost">Cost Preference</Label>
                <Select 
                  value={preferences.costPreference} 
                  onValueChange={(value: any) => setPreferences(prev => ({ ...prev, costPreference: value }))}
                >
                  <SelectTrigger id="cost">
                    <SelectValue placeholder="Select cost range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="low">Budget-friendly</SelectItem>
                    <SelectItem value="medium">Mid-range</SelectItem>
                    <SelectItem value="high">Premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <Label htmlFor="telehealth" className="cursor-pointer">Telehealth preferred</Label>
                <Switch
                  id="telehealth"
                  checked={preferences.telehealth}
                  onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, telehealth: checked }))}
                />
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Action Button */}
      <Button 
        onClick={handleFindPhysicians}
        className="w-full h-12 text-lg font-medium"
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Activity className="h-5 w-5 mr-2 animate-pulse" />
            Finding Providers...
          </>
        ) : (
          <>
            Find Healthcare Providers
            <ArrowRight className="h-5 w-5 ml-2" />
          </>
        )}
      </Button>
    </div>
  );
}
