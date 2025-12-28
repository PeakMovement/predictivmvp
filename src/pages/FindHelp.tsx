import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MedicalFinderAssistant } from '@/components/medical-finder';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LocationInput } from '@/components/medical-finder/LocationInput';
import { UserLocation } from '@/hooks/useUserLocation';
import { Users, ArrowRight, Stethoscope, Clock, Shield } from 'lucide-react';

interface LocationState {
  symptomText?: string;
  skipIntro?: boolean;
  location?: UserLocation;
  severity?: number;
  budget?: number;
}

export const FindHelp = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState | null;
  
  const [userLocation, setUserLocation] = useState<UserLocation | null>(state?.location || null);
  const [showAssistant, setShowAssistant] = useState(state?.skipIntro || !!state?.symptomText);

  const handleStartAssessment = () => {
    setShowAssistant(true);
  };

  // If we have symptom text from check-in or skipIntro, go directly to assistant
  if (showAssistant) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          {/* Header */}
          <div className="mb-6 text-center">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="p-2 rounded-xl bg-primary/20">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Medical Finder</h1>
              </div>
            </div>
            <p className="text-muted-foreground">
              Describe your symptoms and we'll help you find the right healthcare provider
            </p>
          </div>

          {/* Medical Finder Assistant */}
          <MedicalFinderAssistant 
            initialSymptoms={state?.symptomText || ''} 
          />
        </div>
      </div>
    );
  }

  // Entry screen with location input
  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 rounded-2xl bg-primary/20">
              <Stethoscope className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Find Healthcare</h1>
          <p className="text-muted-foreground text-lg">
            Get matched with the right healthcare professional for your needs
          </p>
        </div>

        {/* Main Card */}
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Let's get started</CardTitle>
            <CardDescription>
              Tell us where you're located so we can find providers near you
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Location Input */}
            <LocationInput
              value={userLocation}
              onChange={setUserLocation}
            />

            {/* Start Assessment Button */}
            <Button
              onClick={handleStartAssessment}
              size="lg"
              className="w-full h-14 text-lg font-medium"
            >
              Start Assessment
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>

            {/* Info cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-border/30">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                <Stethoscope className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Expert Matching</p>
                  <p className="text-xs text-muted-foreground">AI-powered provider selection</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                <Clock className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Quick Results</p>
                  <p className="text-xs text-muted-foreground">Find help in minutes</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                <Shield className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Verified Providers</p>
                  <p className="text-xs text-muted-foreground">Licensed professionals</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Disclaimer */}
        <p className="text-xs text-muted-foreground text-center mt-6 px-4">
          This tool is for informational purposes only and does not replace professional medical advice.
          Always consult with a healthcare provider for medical concerns.
        </p>
      </div>
    </div>
  );
};
